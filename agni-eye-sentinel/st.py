import streamlit as st
import cv2
import os
import tempfile
from datetime import datetime
from ultralytics import YOLO

# --- Config ---
MODEL_PATH = "YOLOv8m.pt"
TARGET_CLASSES = ["tank", "camp", "installation", "equipment"]
CONFIDENCE_THRESHOLD = 0.5
os.makedirs("outputs", exist_ok=True)

# --- Load model once ---
@st.cache_resource
def load_model():
    return YOLO(MODEL_PATH)

# --- Detection + Live Preview ---
def detect_with_live_preview(input_video_path):
    model = load_model()
    cap = cv2.VideoCapture(input_video_path)

    if not cap.isOpened():
        st.error("❌ Could not open video.")
        return None

    # Setup output video
    width, height = int(cap.get(3)), int(cap.get(4))
    fps = int(cap.get(5))
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join("outputs", f"annotated_{timestamp}.mp4")
    out_writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    found_classes = set()
    max_conf = 0.0
    total_detections = 0

    preview_placeholder = st.empty()
    st.caption("🔁 Real-time detection preview...")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, stream=True)

        for r in results:
            for box in r.boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                label = model.names[cls]

                if label.lower() in TARGET_CLASSES and conf >= CONFIDENCE_THRESHOLD:
                    found_classes.add(label.lower())
                    total_detections += 1
                    max_conf = max(max_conf, conf)

            annotated = r.plot()
            out_writer.write(annotated)
            preview_placeholder.image(annotated, channels="BGR", use_container_width=True)

    cap.release()
    out_writer.release()

    return {
        "output_path": output_path,
        "labels": list(found_classes) if found_classes else ["none"],
        "confidence": round(max_conf, 3),
        "count": total_detections
    }

# --- Streamlit App ---
st.set_page_config(page_title="Military Detection (Live)", layout="centered")
st.title("🛰️ Military Asset Detector - Live Preview")

uploaded_file = st.file_uploader("📤 Upload surveillance video", type=["mp4", "avi", "mov"])

if uploaded_file:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(uploaded_file.read())
        temp_video_path = tmp.name

    st.info("🚀 Running YOLOv8 detection on video with live bounding box preview...")
    result = detect_with_live_preview(temp_video_path)

    if result:
        st.success("✅ Detection complete!")
        st.video(result["output_path"])

        st.markdown("### 📊 Detection Summary")
        st.write(f"**Detected Classes**: {', '.join(result['labels'])}")
        st.write(f"**Max Confidence**: {result['confidence']}")
        st.write(f"**Total Detections**: {result['count']}")
    else:
        st.error("❌ Detection failed.")