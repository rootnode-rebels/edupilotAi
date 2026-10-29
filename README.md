# EduPilot AI — Your AI Co-Pilot for Teaching

> **Agentic workflow to turn teacher resources into personalized learning experiences.**

---

## 📌 Problem Statement – EduPilot AI

### Problem:
Traditional educational systems face challenges in adapting learning resources to diverse student needs and evolving educational requirements.

### Explanation:
Students often struggle to understand complex topics in PDFs, textbooks, and notes. They have different learning speeds, levels of understanding, and language preferences. Teachers spend considerable time preparing suitable learning materials, while students may struggle to clear doubts when studying alone. Text-based materials may not suit students who learn better through audio or video. EduPilot AI aims to address these challenges by simplifying PDFs, providing personalized content, and answering students' questions.

---

## ⭐ Our USP (Unique Selling Proposition)

* **Personalized Learning**: Tailored learning journeys adapting to each student's knowledge level and pace.
* **Multi-Format Content (Text / Audio / Video)**: Making educational resources accessible across preferred learning styles.
* **AI-Powered Doubt Resolution**: On-demand, context-grounded clarification for student queries.
* **Core Pillars**: Quizzes, AI Chatbox, Progress Tracking, and Doubt Resolution.

---

## 💡 Proposed Solution & Vision

### Core Solution Overview
* **Personalized Learning**: Provides learning support based on individual student needs and progress.
* **AI-Powered Explanations**: Simplifies complex concepts into easy-to-understand explanations.
* **Educational Resource Management**: Organizes learning materials such as PDFs, notes, and videos.
* **Learning Gap Identification**: Identifies areas where students need additional support.
* **Continuous Learning**: Uses assessment results and student progress to recommend suitable learning resources and next steps.

### Key Differentiators
* **AI-Powered PDF Simplification**: Converts teacher-provided educational PDFs into simpler, student-friendly explanations while preserving the original meaning.
* **Performance-Based Content Adaptation**: Adjusts the complexity of explanations according to individual student performance and learning needs.
* **Proactive Learning Gap Detection**: Identifies areas where students struggle and recommends targeted improvement activities.
* **Context-Aware Assistance**: Provides explanations relevant to the student's topic, learning level, and available study materials.
* **Integrated Learning Experience**: Combines personalized explanations, progress tracking, and resource recommendations in one platform.

---

## 🚀 Features of the Solution

1. **Resource Integration**: Combines PDFs, textbooks, and lecture notes in one place.
2. **AI Content Creation**: Converts available learning materials into structured learning content.
3. **Personalized Learning**: Adapts content according to students' knowledge levels and learning needs.
4. **Flexible Learning**: Allows students to learn at their own pace.
5. **Dynamic Updates**: Makes it easier to modify learning content when classroom requirements change.
6. **Progress Tracking**: Helps educators understand students' progress and identify areas needing support.
7. **Teacher Control**: Allows educators to review, modify, and approve generated learning content.
8. **Time Efficiency**: Reduces the time required to organize resources and prepare learning materials.

---

## 🔄 Workflow / Idea

**Agentic workflow to turn teacher resources into personalized learning experiences:**

1. **Resource Ingestion**: Teachers upload PDFs, PPTs, or notes and define learning goals.
2. **Content Processing**: The system automatically extracts, cleans, chunks, and indexes the content.
3. **AI Learning Support**: Generates structured explanations, summaries, Q&A, and quizzes.
4. **Adaptive Learning**: Analyzes student performance to personalize the learning path.
5. **Feedback & Improvement**: Tracks progress, identifies learning gaps, and updates content through a continuous learning loop.

* **Teacher Role**: Uploads materials, reviews progress, and maintains approval control over generated content.
* **Student Role**: Learns at their own pace, practices with quizzes, and asks questions via text or voice.

---

## 💻 Technology Stack

| Layer | Technologies Used | Description |
| :--- | :--- | :--- |
| **FRONTEND** | Next.js (App Router), React, TypeScript, Tailwind CSS | Responsive and interactive web application |
| **AUTHENTICATION** | Firebase Authentication | Role-based user authentication (Teacher & Student) |
| **DATABASE** | Cloud Firestore | Manages course materials, user profiles, and learning progress |
| **FILE STORAGE** | Supabase Storage | Secure storage for course materials and educational PDFs |
| **AI AGENTS** | Multi-agent AI workflow | Autonomous learning, analysis, and planning workflows |
| **DEPLOYMENT** | Vercel (Web App) | Web application hosting and deployment |

---

## 🏛️ System Architecture Overview

A simple, high-level overview of how the system functions:

* **User**: Submits a question (Student) or uploads learning material (Teacher).
* **Frontend**: Captures user input and sends requests to the backend server.
* **Backend Server**: Handles user requests, manages authentication, processes AI tasks, and coordinates with database and storage.
* **Generative AI Engine**: LLM (Gemini / Claude) understands queries, analyzes context, and generates personalized explanations, summaries, and quizzes.
* **Database (Firestore)**: Stores user data, courses, materials, student progress, and learning history.
* **Storage (Supabase)**: Stores PDFs, large files, and processed text chunks.
* **Response**: Returns personalized learning materials (text, audio, video) to the user, with continuous learning feedback sent back to educators.
