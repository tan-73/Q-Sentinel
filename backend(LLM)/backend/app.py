from flask import Flask, render_template, request, redirect, url_for, send_file
from flask_cors import CORS
from PIL import Image
import io
import os
import cv2
import numpy as np
import google.generativeai as genai
import json

# Initialize Flask app
app = Flask(__name__)
CORS(app)  
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Configure Gemini API
API_KEY = ""
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# ───────────────────────────────────────────────────────────────
# Image Enhancement Function
# ───────────────────────────────────────────────────────────────
def enhance_image(image):
    """Enhance uploaded image for better analysis."""
    opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    denoised = cv2.bilateralFilter(opencv_image, 9, 75, 75)
    lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    l = clahe.apply(l)
    enhanced = cv2.merge([l, a, b])
    enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
    enhanced_pil = Image.fromarray(cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB))
    return enhanced_pil

# ───────────────────────────────────────────────────────────────
# Prompt Dictionary
# ───────────────────────────────────────────────────────────────
prompts = { "comprehensive": """🎯 MILITARY IMAGE ANALYSIS - COMPREHENSIVE REPORT:
You are a military analyst AI. Provide a detailed analysis of the objects, vehicles, equipment, personnel, and terrain in this image. Include possible origin, purpose, threat indicators, and any visible insignia or patterns. Output should be highly detailed and structured for defense use.""",

    "quick": """Provide a QUICK military analysis of this image: summarize objects detected, general intent (if any), and highlight any threats or anomalies in under 150 words.""",

    "detection": """Focus on OBJECT DETECTION in this military image: list and describe all vehicles, personnel, weapons, drones, or infrastructure elements detected. Prioritize clarity and completeness.""",

    "threat": """THREAT ASSESSMENT - CRITICAL LEVEL ONLY:
Analyze the image for military threats and respond with ONLY ONE WORD from the following options:

SAFE - No visible threats or hostile indicators
LOW - Potentially suspicious but not immediately dangerous  
MEDIUM - Moderate threat presence; further surveillance recommended
HIGH - Clear threat indicators visible (armed personnel, weaponry, tactical vehicles)
CRITICAL - Imminent threat detected; action needed

Respond with only the single word that best describes the threat level. No explanations, no additional text."""
}

# ───────────────────────────────────────────────────────────────
# Analysis Function
# ───────────────────────────────────────────────────────────────
def analyze_image_with_gemini(pil_image, mode):
    try:
        response = model.generate_content([prompts[mode], pil_image])
        return response.text
    except Exception as e:
        return f"❌ Error: {str(e)}"

# ───────────────────────────────────────────────────────────────
# Routes
# ───────────────────────────────────────────────────────────────
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/detect', methods=['POST'])
def upload():
    if 'image' not in request.files:
        return redirect(url_for('home'))

    file = request.files['image']
    if file.filename == '':
        return redirect(url_for('home'))

    analysis_type = request.form.get('analysis_type', 'comprehensive')
    image = Image.open(file.stream).convert("RGB")
    enhanced = enhance_image(image)

    # Run analysis
    result = analyze_image_with_gemini(enhanced, analysis_type)

    # No image encoding - removed base64 logic
    return render_template('result.html',
                           analysis=result,
                           original_filename=file.filename,
                           analysis_type=analysis_type)

@app.route('/api_status')
def api_status():
    try:
        test_response = model.generate_content("Hello, are you working?")
        return f"<h3>✅ API is active</h3><p>{test_response.text}</p>"
    except Exception as e:
        return f"<h3>❌ API Error</h3><p>{str(e)}</p>"

# ───────────────────────────────────────────────────────────────
# Run App
# ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True, port=8000)