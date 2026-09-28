#!/usr/bin/env python3
"""
DermShield AI - one-shot fixer.
Run from the PROJECT ROOT (the folder that has package.json):

    python apply_fixes.py

1) Repairs broken emoji / symbols (mojibake like "â€¢", "ðŸ”") in every source file.
2) Applies targeted patches to LandingPage, DoctorDashboard, PatientDashboard,
   AdminDashboard and AIAssistant.
Safe to run twice (already-applied patches are skipped).
"""
import re
from pathlib import Path

ROOT = Path(".")

# ---------------------------------------------------------------- encoding repair
def _byte(ch):
    try:
        return ch.encode("cp1252")[0]
    except UnicodeEncodeError:
        return ord(ch) if ord(ch) < 256 else None


def fix_mojibake(s):
    out, i, n = [], 0, 0
    while i < len(s):
        ch = s[i]
        b = _byte(ch) if ord(ch) > 127 else None
        if b is not None and 0xC2 <= b <= 0xF4:
            need = 2 if b < 0xE0 else 3 if b < 0xF0 else 4
            chunk = s[i:i + need]
            bs = [_byte(c) for c in chunk]
            if len(chunk) == need and None not in bs and all(0x80 <= x <= 0xBF for x in bs[1:]):
                try:
                    out.append(bytes(bs).decode("utf-8"))
                    i += need
                    n += 1
                    continue
                except UnicodeDecodeError:
                    pass
        out.append(ch)
        i += 1
    return "".join(out), n


# ---------------------------------------------------------------- patches
# ("str", old, new, expected_count | None=all)  or  ("re", pattern, replacement_fn, 1)
def S(old, new, n=1):
    return ("str", old, new, n)


NEW_IMAGE_HANDLER = '''const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAnalysisError("Please choose a valid image file (PNG or JPEG).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAnalysisError("Image is larger than 10MB. Please choose a smaller photo.");
      return;
    }
    setAnalysisError("");

    // Downscale to max 1024px + JPEG so the base64 stored in the DB stays small (~100-250KB)
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setSelectedImage(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setSelectedImage(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => setAnalysisError("Could not read this image. Try a different file.");
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };'''

DOCTOR_GATE = '''if (!user.isVerified) {
    return (
      <div className="min-h-[calc(100vh-104px)] flex items-center justify-center bg-slate-50 p-6" id="doctor-pending-verification">
        <div className="max-w-md w-full bg-white border border-amber-200 rounded-2xl shadow-md p-8 text-center space-y-4">
          <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Verification Pending</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your medical license is being reviewed by a platform administrator. You will get access to the
            clinical review queue once it is approved. Please refresh or log in again after approval.
          </p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {'''

DEMO_BANNER = '''{DEMO_MODE && (
                      <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl text-violet-900 text-[10px] leading-relaxed">
                        <strong>DEMO MODE:</strong> This result comes from a placeholder model used for UI testing. It is NOT a real prediction and must not be used for any health decision.
                      </div>
                    )}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[10px] leading-relaxed">'''

PATCHES = {
    "src/components/LandingPage.tsx": [
        S('const { error: signUpError } = await signUp(email, password, name, roleSelection);',
          'const { error: signUpError } = await signUp(\n      email,\n      password,\n      name,\n      roleSelection,\n      roleSelection === "doctor" ? license.trim() : undefined\n    );'),
        S('{(["patient", "doctor", "admin"] as UserRole[]).map((r) => (',
          '{(["patient", "doctor"] as UserRole[]).map((r) => ('),
        S('<div className="grid grid-cols-3 gap-2">', '<div className="grid grid-cols-2 gap-2">'),
        S('A clinically-validated decision support prototype combining',
          'A decision support research prototype combining'),
        S('Trained on over 45,000 dermoscopic records from HAM10000, ISIC2019, Fitzpatrick17k, and PAD-UFES-20.',
          'Being trained on public dermoscopic datasets (HAM10000, ISIC2019, Fitzpatrick17k, PAD-UFES-20). Final performance metrics will be published after evaluation.'),
        S('>94.8%</div>', '>TBD</div>'),
        S('>92.1%</div>', '>TBD</div>'),
        S('>93.5%</div>', '>TBD</div>'),
    ],
    "src/components/DoctorDashboard.tsx": [
        S('import { supabase } from "../lib/supabaseClient";',
          'import { supabase } from "../lib/supabaseClient";\nimport { notifyUser } from "../lib/notify";'),
        S('const [verdictSuccess, setVerdictSuccess] = useState(false);',
          'const [verdictSuccess, setVerdictSuccess] = useState(false);\n  const [verdictError, setVerdictError] = useState("");'),
        S('setSubmittingVerdict(true);', 'setSubmittingVerdict(true);\n    setVerdictError("");'),
        S('setVerdictSuccess(true);',
          'await notifyUser(\n        selectedScan.patientId,\n        "verdict",\n        `${user.name} has reviewed your scan (${selectedScan.predictedClass}). Verdict: ${verdict}.`\n      );\n      setVerdictSuccess(true);'),
        S('console.error("Verdict submit failed", err);',
          'console.error("Verdict submit failed", err);\n      setVerdictError("Could not save the verdict. Check your connection / permissions and try again.");'),
        S('{verdictSuccess ? (',
          '{verdictError && (\n                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">{verdictError}</div>\n                    )}\n                    {verdictSuccess ? ('),
        S('setConfirmingConsultId(null);',
          'const confirmedConsult = consultations.find((c) => c.id === consultId);\n      if (confirmedConsult) {\n        await notifyUser(\n          confirmedConsult.patientId,\n          "scheduled",\n          `Your consultation with ${user.name} is confirmed for ${new Date(scheduledAt).toLocaleString()}.`\n        );\n      }\n      setConfirmingConsultId(null);'),
        S('setCompletingConsultId(null);',
          'const completedConsult = consultations.find((c) => c.id === consultId);\n      if (completedConsult) {\n        await notifyUser(\n          completedConsult.patientId,\n          "completed",\n          `Your consultation with ${user.name} is complete. Check the follow-up notes in Specialist & Referrals.`\n        );\n      }\n      setCompletingConsultId(null);'),
        # audit-log bugs: wrong field names / wrong casing
        S('doctorVerdict?.verdict', 'doctorVerdict?.status', None),
        S('{log.classLabel}', '{log.predictedClass}'),
        S('log.riskLevel === "high"', 'log.riskLevel === "High"'),
        S('log.riskLevel === "medium"', 'log.riskLevel === "Medium"'),
        S(': 100}%', ': 0}%'),
        # block unverified doctors
        S('const getInitials = (name: string) => {', DOCTOR_GATE),
    ],
    "src/components/PatientDashboard.tsx": [
        S('const MOCK_CLASSES = [',
          'const DEMO_MODE = true; // set to false once the real CNN+ViT model is wired up\nconst MOCK_CLASSES = ['),
        S('Step 2: Clinician specimen review checklist', 'Step 3: Clinician specimen review checklist'),
        S('<div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[10px] leading-relaxed">',
          DEMO_BANNER),
        ("re",
         r'const handleImageFileChange = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{.*?\n  \};',
         lambda m: NEW_IMAGE_HANDLER, 1),
    ],
    "src/components/AdminDashboard.tsx": [
        S('const str = value === null || value === undefined ? "" : String(value);',
          'let str = value === null || value === undefined ? "" : String(value);\n    // guard against CSV/Excel formula injection\n    if (/^[=+\\-@]/.test(str)) str = "\'" + str;'),
        S('const blob = new Blob([csvLines.join("\\n")], { type: "text/csv;charset=utf-8;" });',
          'const blob = new Blob(["\\uFEFF" + csvLines.join("\\r\\n")], { type: "text/csv;charset=utf-8;" });'),
    ],
    "src/components/AIAssistant.tsx": [
        S('w-[360px] sm:w-[420px]', 'w-[calc(100vw-2.5rem)] sm:w-[420px]'),
    ],
}

# ---------------------------------------------------------------- runner
def read(path):
    data = path.read_bytes()
    try:
        return data.decode("utf-8-sig")
    except UnicodeDecodeError:
        return data.decode("cp1252")


def main():
    if not (ROOT / "package.json").exists():
        print("!! Run this from the project root (folder containing package.json).")
        return

    files = set()
    for p in (ROOT / "src").rglob("*"):
        if p.suffix in {".ts", ".tsx", ".css", ".html"}:
            files.add(p)
    for extra in ["server.ts", "vite.config.ts", "index.html", "metadata.json"]:
        if (ROOT / extra).exists():
            files.add(ROOT / extra)
    for rel in PATCHES:
        if (ROOT / rel).exists():
            files.add(ROOT / rel)

    for path in sorted(files):
        rel = path.relative_to(ROOT).as_posix()
        raw = read(path)
        crlf = "\r\n" in raw
        text = raw.replace("\r\n", "\n")
        original = text

        text, fixed = fix_mojibake(text)
        notes = []
        if fixed:
            notes.append(f"encoding: {fixed} sequences repaired")

        for kind, old, new, n in PATCHES.get(rel, []):
            if kind == "str":
                # if the new text still contains the old text, "already applied" = new text present
                if old in new and new in text:
                    notes.append(f"  skip (already applied): {old[:50]!r}")
                    continue
                c = text.count(old)
                if c == 0:
                    if new in text:
                        notes.append(f"  skip (already applied): {old[:50]!r}")
                    else:
                        notes.append(f"  !! NOT FOUND: {old[:60]!r}")
                elif n is not None and c != n:
                    notes.append(f"  !! found {c}x (expected {n}), skipped: {old[:60]!r}")
                else:
                    text = text.replace(old, new)
                    notes.append(f"  patched ({c}x): {old[:50]!r}")
            else:
                text2, c = re.subn(old, new, text, count=1, flags=re.S)
                if c:
                    text = text2
                    notes.append("  patched: handleImageFileChange")
                elif "Downscale to max 1024px" in text:
                    notes.append("  skip (already applied): handleImageFileChange")
                else:
                    notes.append("  !! NOT FOUND: handleImageFileChange")

        left = len(re.findall(r"Ã.|â€|ðŸ", text))
        if left:
            notes.append(f"  ?? {left} suspicious garbled sequences still left - check manually")

        if text != original:
            out = text.replace("\n", "\r\n") if crlf else text
            path.write_text(out, encoding="utf-8", newline="")
        if notes:
            print(f"[{rel}]")
            for line in notes:
                print(line)

    print("\nDone. Now run: npm install && npm run lint && npm run dev")


if __name__ == "__main__":
    main()
