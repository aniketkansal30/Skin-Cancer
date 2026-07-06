import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, AlertCircle, Bot, User, HelpCircle, Loader2 } from "lucide-react";
import { useAuth } from "../AuthContext";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

function simulateClientChat(userQuery: string, userName: string, userRole: string): string {
  const query = userQuery.toLowerCase().trim();

  // Check emergency symptoms
  if (
    (query.includes("bleeding") && (query.includes("severe") || query.includes("heavy") || query.includes("uncontrolled"))) ||
    query.includes("breathing") || query.includes("chest pain") || query.includes("emergency")
  ) {
    return "🚨 **Emergency Medical Warning:** If you are experiencing severe bleeding, rapidly spreading infection, breathing difficulties, sudden severe pain, or another life-threatening symptom, please seek **immediate emergency medical attention** or call your local emergency number (e.g., 911). Do not delay care by seeking online information.";
  }

  // Exact matching or semantic matching rules
  if (query.includes("skin cancer") || query.includes("cancer type")) {
    return "Skin cancer is the out-of-control growth of abnormal skin cells, typically triggered by ultraviolet (UV) radiation from sun exposure or tanning beds. The three most common types are:\n\n- **Melanoma (MEL)**: The most serious type which begins in pigment-producing melanocytes. Often looks like an atypical asymmetrical mole.\n- **Basal Cell Carcinoma (BCC)**: The most frequent type, presenting as a pearly translucent bump or pink patch that doesn't heal.\n- **Squamous Cell Carcinoma (SCC)**: Characterized by a scaly, firm red nodule, sore, or persistent ulcer.\n\nEarly detection is the key to successful treatment. Monthly skin self-checks are recommended.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("abcde") || query.includes("asymmetry") || query.includes("warning sign")) {
    return "The **ABCDE rule** is a globally recognized dermatological screening guide to evaluate suspicious moles or cutaneous spots:\n\n- **A for Asymmetry**: One half of the spot or mole does not visually match the other half.\n- **B for Border**: The borders are irregular, jagged, notched, ragged, or blurred.\n- **C for Colour**: The color is uneven with varying shades of brown, black, tan, red, pink, or white.\n- **D for Diameter**: The spot is larger than 6 millimeters across (about the size of a pencil eraser), though melanomas can sometimes be smaller.\n- **E for Evolving**: The mole is changing in size, shape, color, thickness, or shows new symptoms like itching or bleeding.\n\nAny mole matching one or more of these parameters should be examined physically by a doctor.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("grad-cam") || query.includes("grad cam") || query.includes("activation mapping")) {
    return "Our **Grad-CAM (Gradient-weighted Class Activation Mapping)** technology is an advanced explainable AI feature. When you upload a scan, the CNN+ViT model computes which pixel regions contributed most heavily to the classification prediction.\n\nIn the interactive viewer, this is shown as a colorful thermal focus overlay (ranging from calm blue to active yellow and hot red). It allows doctors and patients to visualize exactly what features (such as edge texture, pigmentation irregularity, or border jaggedness) the model focused on, rather than acting as an untraceable 'black box'.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("supabase") || query.includes("database") || query.includes("db")) {
    return "DermShield AI integrates **Supabase** for secure, real-time database cloud persistence. This powers:\n\n- **Authentication & Profiles**: Secure role-based credentials for Patients, Doctors, and Administrators.\n- **Real-Time Notifications**: Instant synchronization when an analysis result is verified, a consultation is scheduled, or a referral is issued.\n- **Durable Storage**: Maintaining long-term records of patient scans, Grad-CAM maps, chronological tracking lines, and audit logs.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("cnn") || query.includes("transformer") || query.includes("neural network") || query.includes("pipeline") || query.includes("vit")) {
    return "DermShield AI uses a hybrid **Ensemble Neural Network Pipeline** combining **Convolutional Neural Networks (CNN)** and **Vision Transformers (ViT)**:\n\n- **CNN (Local Feature Extractor)**: Excels at capturing fine-grained local patterns such as borders, texture changes, scale, and color variation.\n- **Vision Transformer (Global Contextual Encoder)**: Uses self-attention mechanisms to capture global anatomical relationships across the entire lesion surface.\n\nThis hybrid pipeline delivers robust representation learning and significantly outperforms traditional individual models in diagnostic accuracy.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("explainable") || query.includes("xai")) {
    return "**Explainable AI (XAI)** is a core pillar of DermShield AI. In clinical applications, black-box predictions undermine physician trust and fail to educate patients.\n\nBy implementing Grad-CAM visual heatmaps, confidence ratings, and uncertainty factors, DermShield makes its inner workings transparent. Doctors can verify that the AI is attending to clinical biomarkers rather than image artifacts (like marker lines or body hair), and patients can learn how to monitor relevant spots.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("difference between confidence") || query.includes("confidence vs uncertainty") || query.includes("confidence versus") || query.includes("difference between")) {
    return "While they seem similar, **Model Confidence** and **Prediction Uncertainty** measure separate attributes:\n\n- **Model Confidence Score**: Represents how strongly the neural network favors the predicted label (e.g., 94% Melanoma) over other alternatives based on textbook features.\n- **Prediction Uncertainty**: Measures the reliability or margin of error of that prediction. High uncertainty indicates that the image was out-of-distribution, blurry, poorly lit, or highly atypical, meaning the prediction should be treated with extreme skepticism.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("viva") || query.includes("preparation") || query.includes("qa") || query.includes("questions")) {
    return "Here is a **DermShield AI Viva Cheat Sheet** for your exam preparation:\n\n1. **Why CNN + ViT?** CNN extracts local details (borders, color); ViT models global spatial correlations. Together, they achieve optimal representation.\n2. **What is Grad-CAM?** Gradient-weighted Class Activation Mapping. It computes gradients of target scores with respect to the last convolutional layer, generating visual heatmaps.\n3. **Why Supabase?** Provides secure cloud storage, automated schema migrations, real-time client subscription channels, and simple JWT session management.\n4. **Why track lesions chronologically?** It addresses the 'E' in ABCDE (Evolving) by plotting diagnostic histories and visual changes over weeks or months.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("advantage") || query.includes("benefit") || query.includes("traditional")) {
    return "DermShield AI provides several game-changing **advantages over traditional screening methods**:\n\n- **Explainability First**: Unlike traditional 'black-box' systems, we provide visual heatmaps and uncertainty factors.\n- **Longitudinal Tracking**: We compile visual timelines instead of isolated single-session scans, making evolution apparent.\n- **Clinical Ingress**: It bridges the gap between home self-checks and clinical review with built-in doctor queues and referral paths.\n- **Real-Time Synchronisation**: Facilitated by Supabase client state loops.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("future scope") || query.includes("future") || query.includes("growth")) {
    return "The **future scope of DermShield AI** includes:\n\n- **Dermoscopic Attachment Calibration**: Support for smartphone lens attachments to standardize polarization.\n- **Multi-Modal Integration**: Correlating visual scans with genomic risk scoring and environmental UV index patterns.\n- **Mobile Native Integrations**: Launching native iOS/Android apps with automated edge-focus guidance during camera upload.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("troubleshoot") || query.includes("fails") || query.includes("error") || query.includes("problem") || query.includes("failed") || query.includes("delay")) {
    return "Here is the **DermShield Troubleshooting Guide**:\n\n- **Image Upload Fails**: Ensure your image is a valid PNG or JPEG under 10MB. Avoid highly blurry photos or pictures with high glare.\n- **License Pending**: If you are a doctor and cannot review scans, an Admin must manually verify your profile under 'User Management'.\n- **Notification Delays**: Ensure you are logged in and have an active, stable internet connection to establish the database socket subscription.\n- **Data Not Refreshing**: Try clearing your browser cache or performing a hard refresh (Ctrl+F5) to clear cached queries.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("body map") || query.includes("location") || query.includes("anatomical")) {
    return "The **Interactive 3D Body Map** is used to record the anatomical location of skin lesions. When you submit a scan, pinning it on the body map allows DermShield to distinguish between different spots (e.g., chest vs. leg) and automatically pair future scans to compile distinct progression timelines.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("notification") || query.includes("alerts")) {
    return "DermShield features a real-time **Notification Center** that instantly alerts:\n\n- **Patients** when a doctor posts a clinical review verdict, schedules a consultation, or issues a referral.\n- **Doctors** when a new patient case enters their clinic queue or a consultation is booked.\n- **Admins** when a new medical provider joins the platform waiting for registration verification.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("log") || query.includes("trace")) {
    return "We maintain granular **Activity and Telemetry Logs**:\n\n- **Security Audit Logs**: Track authentication changes, metadata updates, and diagnostic CSV exports.\n- **Neural Pipeline Trace Logs**: Record model latency metrics, exact inference outputs, and confidence distributions for system observability.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("report") || query.includes("csv") || query.includes("export")) {
    return "DermShield supports comprehensive reporting options:\n\n- **Individual PDF Reports**: Patients and Doctors can compile individual scans with Grad-CAM overlays into diagnostic reports.\n- **Admin CSV Exports**: Administrators can download aggregate anonymized telemetry statistics for audit logs and platform verification records.\n- **Anatomical Locations**: Pinned on an interactive Body Map to maintain clear histories.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("referral") || query.includes("refer")) {
    return "Our integrated **Referral Workflow** allows general practitioners or reviewing doctors to escalate high-risk cases to specialists. Referrals include reason, clinical urgency level, timeline history, and notes to ensure continuity of care.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("analytics") || query.includes("dashboard")) {
    return "The dashboards provide customized statistics:\n\n- **Patient Dashboard**: Tracks lesion counts, sun safety index, and monthly self-exam progress.\n- **Doctor Dashboard**: Displays queue counts, diagnostic category ratios, and pending cases.\n- **Admin Dashboard**: Visualizes global user distributions, model execution time, and system trace health.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("profile") || query.includes("password") || query.includes("account")) {
    return "In the **Profile Management** tab, users can update passwords, input emergency contact details, update doctor medical credentials, and view account roles securely.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("confidence") || query.includes("uncertainty") || query.includes("score")) {
    return "On DermShield AI, every analysis features two vital model metrics:\n\n- **Model Confidence Score**: A percentage indicating how closely the visual features in the image align with the predicted class (e.g., Melanocytic Nevus). Highly clear, textbook presentations yield high confidence.\n- **Uncertainty Factor**: High uncertainty highlights that the model's reliability is lower for that specific scan, possibly due to poor lighting, low resolution, or atypical lesion features.\n\nRemember: Model confidence represents statistical match strength, not diagnostic truth. Even a 99% confident result should be clinically verified by a professional if suspicious.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("replace") || query.includes("substitute") || query.includes("licensed")) {
    return "No. **DermShield AI cannot and does not replace a licensed dermatologist, doctor, or clinical specialist.** \n\nDermShield AI is purely a clinical decision support and patient education screening platform. AI calculations do not constitute a diagnostic medical verdict. To verify skin lesions, a physician must perform physical dermoscopy, take a detailed clinical history, and perform a biopsy with pathology examination if necessary.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("upload") || query.includes("scan") || query.includes("new scan") || query.includes("work")) {
    return "To use the DermShield AI screening system:\n\n1. Navigate to the **New Scan** tab on your Patient Dashboard.\n2. Click the upload box to select or drag-and-drop a close-up, clear macro photo of the skin lesion.\n3. Specify patient demographic information (age and gender) to assist metadata correlation.\n4. Click on our interactive **3D Body Map** to pin the exact anatomical location where the lesion is located.\n5. Click **Submit for AI Analysis** to run the CNN+Vision Transformer ensemble model.\n\nOnce completed, your report, explainability Grad-CAM map, and patient description will be instantly available in your scan history.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("track") || query.includes("lesion") || query.includes("chronology") || query.includes("nickname")) {
    return "Our **Lesion Tracking** workflow allows you to monitor the evolution of specific spots over long periods. When you submit a scan, you can assign it to an existing lesion nickname or create a new one.\n\nBy grouping repeated scans under the same nickname, DermShield compiles a **Lesion Chronology & Progression Timeline**. You can visually track size evolution, changes in prediction categories, and monitor clinical changes to identify the 'E' (Evolving) warning sign easily.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("license") || query.includes("verify") || query.includes("approve")) {
    return "We maintain a secure, professional workspace. When a doctor registers on our platform, they must input their unique Medical License Register ID. All registered doctors are set as pending until a platform Administrator manually reviews their credentials against official medical records.\n\nOnce verified, the doctor can access the Doctor Dashboard to review patient cases, post verdicts, and schedule consultations.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("melanoma")) {
    return "Melanoma is the most serious form of skin cancer, originating in the melanocytes (cells that produce melanin pigment). It can develop anywhere on the body, including sun-exposed areas or even under fingernails.\n\nWarning signs include moles that display any of the **ABCDE characteristics** (Asymmetry, Border irregularity, multi-colored variegation, Diameter >6mm, or rapidly Evolving). Early detection through digital screening and prompt dermatologist referral is crucial for complete surgical cure.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  } else if (query.includes("admin") || query.includes("stats") || query.includes("logs")) {
    return "In the **Admin Dashboard**, platform administrators can oversee user accounts, approve pending doctor registrations, inspect system performance logs, and review aggregate statistics such as total scans, risk distribution ratios, and AI-Doctor alignment rate trends.\n\n_This information is for educational purposes only and does not replace professional medical advice._";
  }

  return `Thank you for asking! As the **DermShield AI Assistant**, I can help you with educational information about skin health and platform features.

Based on your query "${userQuery}", I would like to share that keeping close track of changing spots, protecting your skin from intensive UV rays (using SPF 30+ sunscreen), and conducting monthly self-skin exams are the most proactive steps you can take for skin cancer prevention.

If you are asking about a specific mole or atypical spot, please use our **New Scan** section to run a decision support analysis, or consult a board-certified dermatologist for a clinical diagnosis.

Is there a specific topic, like the **ABCDE rule**, **Grad-CAM explainability**, or **Lesion Tracking** that you would like me to detail further?

_This information is for educational purposes only and does not replace professional medical advice._`;
}

export default function AIAssistant() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: `Hello! I am the **DermShield AI Assistant**. 🩺✨ 

I am here to answer your questions about skin cancer types, prevention guidelines (like sunscreen and UV protection), the **ABCDE warning signs**, or how our explainable AI (**CNN + Vision Transformer** pipeline and **Grad-CAM** heatmaps) works.

How can I assist you with your skin health education today?`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const quickQuestions = [
    "What is skin cancer?",
    "Explain the ABCDE rule.",
    "What is Grad-CAM?",
    "Can AI replace doctors?",
    "How does DermShield work?",
    "How to track a lesion?"
  ];

  const formatMessageText = (text: string) => {
    return text.split("\n").map((line, i) => {
      let content = line;
      const isBullet = line.trim().startsWith("- ");
      if (isBullet) {
        content = line.trim().substring(2);
      }

      // Replace **bold** with <strong>bold</strong>
      const parts: React.ReactNode[] = [];
      let currentText = content;
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      let lastIndex = 0;
      let keyCounter = 0;

      while ((match = boldRegex.exec(currentText)) !== null) {
        if (match.index > lastIndex) {
          parts.push(currentText.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={`bold-${keyCounter++}`} className="font-extrabold text-slate-900">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < currentText.length) {
        parts.push(currentText.substring(lastIndex));
      }

      if (isBullet) {
        return (
          <li key={`line-${i}`} className="ml-5 list-disc text-slate-700 my-1 text-xs">
            {parts.length > 0 ? parts : content}
          </li>
        );
      }
      return (
        <p key={`line-${i}`} className="text-xs text-slate-700 my-1.5 leading-relaxed">
          {parts.length > 0 ? parts : content}
        </p>
      );
    });
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessageText = textToSend;
    setInput("");
    setError(null);

    // Add user message to state
    const userMsg: Message = {
      id: "u-" + Math.random().toString(36).substring(2, 9),
      sender: "user",
      text: userMessageText,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build conversation payload to send to backend with chat history
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessageText,
          history: messages.map(m => ({
            role: m.sender === "user" ? "user" : "model",
            text: m.text
          })),
          userId: currentUser?.id || "anonymous",
          userRole: currentUser?.role || "guest",
          userName: currentUser?.name || "Guest"
        })
      });

      const contentType = response.headers.get("content-type") || "";
      let replyText = "";

      if (response.ok && contentType.includes("application/json")) {
        const data = await response.json();
        replyText = data.reply;
      } else {
        // Response is either not ok or not JSON (e.g. Vercel SPA routing fallback index.html)
        // Fallback silently to our high-fidelity client-side simulator
        console.warn("API returned invalid response type or status, using client-side fallback.");
        replyText = simulateClientChat(userMessageText, currentUser?.name || "Guest", currentUser?.role || "guest");
      }

      const aiMsg: Message = {
        id: "ai-" + Math.random().toString(36).substring(2, 9),
        sender: "ai",
        text: replyText,
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.warn("Fetch failed, falling back to client-side simulator:", err);
      const replyText = simulateClientChat(userMessageText, currentUser?.name || "Guest", currentUser?.role || "guest");
      const aiMsg: Message = {
        id: "ai-" + Math.random().toString(36).substring(2, 9),
        sender: "ai",
        text: replyText,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      <div className="fixed bottom-5 right-5 z-[100]" id="floating-chat-trigger">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-3 bg-gradient-to-r ${
            isOpen ? "from-rose-600 to-red-500 hover:from-rose-700" : "from-cyan-600 to-teal-500 hover:from-cyan-700"
          } text-white font-bold text-xs rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer select-none group border border-white/20`}
        >
          {isOpen ? (
            <>
              <X className="h-4.5 w-4.5 animate-spin-once" />
              <span>Close Assistant</span>
            </>
          ) : (
            <>
              <div className="relative">
                <MessageSquare className="h-4.5 w-4.5" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-400 rounded-full animate-pulse border border-white" />
              </div>
              <span>Ask DermShield AI</span>
              <Sparkles className="h-3.5 w-3.5 text-cyan-200 group-hover:animate-bounce" />
            </>
          )}
        </button>
      </div>

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-5 w-[360px] sm:w-[420px] h-[550px] bg-white rounded-2xl border border-slate-200 shadow-2xl z-[100] flex flex-col overflow-hidden animate-slide-up"
          id="floating-chat-card"
        >
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 bg-gradient-to-tr from-cyan-500 to-teal-400 rounded-lg flex items-center justify-center text-slate-900 font-extrabold shadow-inner">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-wide uppercase leading-none">DermShield AI</h3>
                <span className="text-[9px] text-cyan-400 font-mono tracking-wider flex items-center gap-1 mt-0.5 font-bold">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full inline-block animate-ping" />
                  Clinical Support Assistant
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" id="chat-messages-container">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                    msg.sender === "user"
                      ? "bg-slate-200 border-slate-300 text-slate-700"
                      : "bg-teal-50 border-teal-100 text-teal-700"
                  }`}
                >
                  {msg.sender === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>

                {/* Bubble bubble wrapper */}
                <div className="space-y-1 max-w-[80%]">
                  <div
                    className={`p-3 rounded-2xl text-slate-800 shadow-sm border ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-slate-100 to-slate-50 border-slate-200/80 rounded-tr-none"
                        : "bg-white border-slate-200/80 rounded-tl-none"
                    }`}
                  >
                    {formatMessageText(msg.text)}
                  </div>
                  <div
                    className={`text-[8px] font-mono text-slate-400 uppercase tracking-widest ${
                      msg.sender === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}

            {/* AI thinking skeleton loader */}
            {loading && (
              <div className="flex gap-2.5">
                <div className="h-7 w-7 rounded-full bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0 shadow-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
                <div className="space-y-1 max-w-[80%]">
                  <div className="bg-white border border-slate-200/80 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            {/* Error badge */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <span className="font-bold">Assistant Error:</span> {error}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Pills */}
          <div className="px-4 py-2 border-t border-slate-100 bg-white/90 flex flex-wrap gap-1.5 justify-center">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                disabled={loading}
                onClick={() => handleSend(q)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full transition-all cursor-pointer border border-slate-200 hover:border-slate-300 disabled:opacity-50 select-none flex items-center gap-1"
              >
                <HelpCircle className="h-3 w-3 text-cyan-600" />
                <span>{q}</span>
              </button>
            ))}
          </div>

          {/* Text input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a skin health or platform question..."
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-teal-500 text-slate-800 shadow-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-700 text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none flex items-center justify-center shrink-0 border border-white/10"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
