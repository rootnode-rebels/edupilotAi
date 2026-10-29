import os
from fpdf import FPDF

class EduPilotPDF(FPDF):
    def header(self):
        self.set_fill_color(104, 66, 255) # Primary Purple #6842FF
        self.rect(0, 0, 210, 10, 'F')
        self.set_y(14)
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(120, 120, 140)
        self.cell(0, 5, 'EduPilot AI - Project Demo & Presentation Guide for Judges', align='R')
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(150, 150, 160)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}} | EduPilot AI - Your AI Co-Pilot for Teaching', align='C')

    def chapter_title(self, num, title):
        self.set_font('Helvetica', 'B', 13)
        self.set_text_color(104, 66, 255)
        self.cell(0, 8, f'{num}. {title}', new_x='LMARGIN', new_y='NEXT')
        self.set_draw_color(220, 220, 235)
        self.set_line_width(0.5)
        self.line(self.get_x(), self.get_y(), self.get_x() + 190, self.get_y())
        self.ln(4)

    def section_heading(self, title):
        self.set_font('Helvetica', 'B', 10.5)
        self.set_text_color(30, 41, 59)
        self.cell(0, 6, title, new_x='LMARGIN', new_y='NEXT')
        self.ln(1)

    def body_text(self, text, indent=0):
        self.set_font('Helvetica', '', 9.5)
        self.set_text_color(51, 65, 85)
        if indent > 0:
            self.set_x(self.get_x() + indent)
        self.multi_cell(190 - indent, 5, text)
        self.ln(2)

    def bullet_point(self, bold_prefix, text):
        self.set_font('Helvetica', 'B', 9.5)
        self.set_text_color(104, 66, 255)
        self.cell(5, 5, '-', align='C')
        self.set_text_color(30, 41, 59)
        self.cell(self.get_string_width(bold_prefix) + 1, 5, bold_prefix)
        self.set_font('Helvetica', '', 9.5)
        self.set_text_color(51, 65, 85)
        remaining_w = 190 - 5 - (self.get_string_width(bold_prefix) + 1)
        self.multi_cell(remaining_w, 5, text)
        self.ln(1.5)

    def callout_box(self, title, lines):
        self.set_fill_color(248, 247, 255)
        self.set_draw_color(104, 66, 255)
        self.set_line_width(0.6)
        
        # Calculate height
        h = 8 + len(lines) * 5.2
        x = self.get_x()
        y = self.get_y()
        self.rect(x, y, 190, h, 'DF')
        
        self.set_xy(x + 4, y + 3)
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(104, 66, 255)
        self.cell(0, 5, title, new_x='LMARGIN', new_y='NEXT')
        
        self.set_font('Helvetica', '', 9)
        self.set_text_color(40, 50, 70)
        for line in lines:
            self.set_x(x + 4)
            self.cell(0, 5, line, new_x='LMARGIN', new_y='NEXT')
        self.set_xy(x, y + h + 4)

def build_pdf():
    pdf = EduPilotPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    
    # ─── PAGE 1: TITLE & CORE IDEA ───
    pdf.add_page()
    
    # Main Hero Title
    pdf.set_font('Helvetica', 'B', 22)
    pdf.set_text_color(17, 23, 43)
    pdf.cell(0, 10, 'EduPilot AI', align='C', new_x='LMARGIN', new_y='NEXT')
    
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(104, 66, 255)
    pdf.cell(0, 6, 'Your AI Co-Pilot for Teaching & Adaptive Learning', align='C', new_x='LMARGIN', new_y='NEXT')
    
    pdf.set_font('Helvetica', 'I', 9.5)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 5, 'Comprehensive Judge Presentation & Live Demonstration Blueprint', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(5)
    
    # Overview Box
    pdf.callout_box('Project Summary & High-Level Value Proposition', [
        'Domain: Agentic AI and Autonomous Pedagogical Workflows',
        'Problem: One-size-fits-all education leaves students struggling with dense PDFs; teachers spend 60%+ time on repetitive tasks.',
        'Solution: Transforms static course PDFs into personalized, multi-tier AI explanations, auto-generated assessments, and real-time analytics.',
        'Key USP: Grounded RAG PDF Simplification with dynamic Beginner / Intermediate / Advanced explanation adaptation.'
    ])
    
    # Chapter 1: The Problem & The Solution
    pdf.chapter_title('1', 'Problem Statement & The EduPilot AI Solution')
    
    pdf.section_heading('The Classroom Reality (The Problem):')
    pdf.body_text(
        'In traditional education systems, teachers provide textbooks, PDFs, and notes designed for the "average" student. '
        'However, students learn at vastly different speeds, with varying foundational knowledge and learning preferences. '
        'When students study alone, complex academic language in PDFs causes frustration, doubts remain unresolved, and '
        'struggling students quietly fall behind. Meanwhile, educators spend over 60% of their working hours manually preparing '
        'materials, formatting quizzes, and grading rather than mentoring.'
    )
    
    pdf.section_heading('The EduPilot AI Solution:')
    pdf.body_text(
        'EduPilot AI creates a complete, closed-loop educational ecosystem bridging teachers and students:'
    )
    pdf.bullet_point('Teacher Co-Pilot: ', 'Rapidly ingests raw PDFs, organizes modular courses, and drafts diagnostic assessments using AI.')
    pdf.bullet_point('Student AI Tutor: ', 'Answers doubts 24/7 with RAG-grounded citations and simplifies complex topics to three selectable comprehension tiers.')
    pdf.bullet_point('Closed-Loop Analytics: ', 'Continuously tracks student quiz scores and alerts teachers to exact classroom knowledge gaps.')
    
    pdf.ln(3)

    # ─── PAGE 2: COMPLETE 5-FEATURE DEMO WALKTHROUGH ───
    pdf.add_page()
    pdf.chapter_title('2', 'Complete 5-Feature Live Demonstration Walkthrough')
    pdf.body_text('Present these 5 core features in sequence to give the judges a seamless, compelling demonstration:')
    
    # Feature 1
    pdf.section_heading('Feature 1: Teacher Uploads Courses & Educational Materials')
    pdf.bullet_point('What it is: ', 'The teacher creates courses (e.g., "Introduction to AI & Machine Learning") and uploads syllabus PDFs and notes.')
    pdf.bullet_point('How it works: ', 'The system parses PDFs using unpdf, extracts text, cleans formatting, and generates semantic vector chunks.')
    pdf.bullet_point('What to show in Demo: ', 'Open the Teacher Studio (teacher@edupilot.ai), navigate to "Courses", and highlight the ready-to-use course materials.')
    pdf.ln(2)

    # Feature 2
    pdf.section_heading('Feature 2: Students Access Courses & Personalized Dashboard')
    pdf.bullet_point('What it is: ', 'Students log into their dedicated portal to access enrolled courses, view syllabus objectives, and track mastery.')
    pdf.bullet_point('How it works: ', 'Role-based authentication ensures students see their individualized learning path and verified course modules.')
    pdf.bullet_point('What to show in Demo: ', 'Open the Student Dashboard (student.demo@edupilot.ai), showing active enrollments and progress metrics.')
    pdf.ln(2)

    # Feature 3
    pdf.section_heading('Feature 3: Teacher Generates & Assigns Assessments via AI')
    pdf.bullet_point('What it is: ', 'Teacher Co-Pilot automatically drafts diagnostic multiple-choice questions grounded in course concepts.')
    pdf.bullet_point('How it works: ', 'Powered by Agnes/Gemini AI with strict Zod schema validation; ensures 4 options, clear pedagogical rationales, and difficulty levels.')
    pdf.bullet_point('What to show in Demo: ', 'Click "Generate Questions with AI", watch 5 high-quality questions appear in seconds, and show teacher approval controls.')
    pdf.ln(2)

    # Feature 4
    pdf.section_heading('Feature 4: Student AI Tutor with RAG PDF Simplification (The Star Feature)')
    pdf.bullet_point('What it is: ', 'An interactive full-screen AI Tutor that breaks down complex PDF topics into student-friendly explanations.')
    pdf.bullet_point('RAG Grounding: ', 'Retrieves exact excerpts from the uploaded PDF so answers are 100% verified with clickable citations (No Hallucinations).')
    pdf.bullet_point('3-Tier Complexity Toggling: ', 'Students click Beginner (simple analogies), Intermediate (core mechanics), or Advanced (mathematical rigor).')
    pdf.bullet_point('What to show in Demo: ', 'Ask "What is gradient descent?", toggle between Beginner and Advanced, and point out the grounded PDF citations.')
    pdf.ln(2)

    # Feature 5
    pdf.section_heading('Feature 5: Teacher Diagnostic Analytics & Quiz Gap Detection')
    pdf.bullet_point('What it is: ', 'Real-time classroom heatmaps showing mastery scores across individual concepts.')
    pdf.bullet_point('How it works: ', 'Quiz submissions automatically update student profiles, highlighting struggling topics (e.g. Neural Networks).')
    pdf.bullet_point('What to show in Demo: ', 'Show the Teacher Analytics view displaying concept mastery radars and struggle alerts.')

    # ─── PAGE 3: PITCH SCRIPT & DEMO CHEAT SHEET ───
    pdf.add_page()
    pdf.chapter_title('3', 'Judge Presentation Script (Word-for-Word Presenter Guide)')
    
    pdf.section_heading('Part 1: The 45-Second Opening Hook')
    pdf.body_text(
        '"Respected judges, every student in a classroom understands at a different pace, yet traditional learning gives everyone the exact same textbook PDF. When students get stuck studying alone, they lose confidence. At the same time, teachers spend over 60% of their time formatting quizzes and grading instead of teaching.\n\n'
        'We built EduPilot AI - an autonomous co-pilot that turns static teacher PDFs into an adaptive learning experience. Let us show you how it works in real-time."'
    )
    
    pdf.section_heading('Part 2: The 3-Minute Live Demo Execution')
    pdf.bullet_point('Step 1 (Teacher): ', '"Here on the Teacher Portal, I have uploaded our course syllabus. Instead of spending hours writing test questions, I click \'Generate with AI\', and our Co-Pilot creates 5 curriculum-aligned diagnostic questions in seconds."')
    pdf.bullet_point('Step 2 (Student): ', '"Now, logging in as a student, I have access to this course. When I encounter a difficult concept, I open our AI Tutor workspace."')
    pdf.bullet_point('Step 3 (RAG & Tiers): ', '"Notice two critical innovations: First, every answer cites the exact page from the teacher\'s PDF. Second, I can toggle from Beginner - which uses simple everyday analogies - to Advanced, which gives me rigorous mathematical formulas."')
    pdf.bullet_point('Step 4 (Analytics): ', '"Finally, as students complete diagnostic quizzes, the teacher dashboard instantly surfaces class-wide struggle points, allowing the teacher to take immediate corrective action."')
    pdf.ln(2)

    pdf.section_heading('Part 3: The Closing Statement')
    pdf.body_text(
        '"EduPilot AI is not just a chatbot - it is a complete, continuous learning loop that saves teachers hours of repetitive work while ensuring every student receives personalized, grounded guidance. Thank you, and we welcome your questions!"'
    )
    pdf.ln(3)

    pdf.chapter_title('4', 'Live Demo Credentials & System Cheat Sheet')
    pdf.callout_box('Quick-Access Demo Credentials (Pre-Seeded & Ready)', [
        'Teacher Account:  teacher@edupilot.ai   | Password: TeacherPass123!   (Preloaded with 11 courses)',
        'Student Account:  student.demo@edupilot.ai | Password: Password123!      (Enrolled & Ready)',
        'Local Demo URL:   http://localhost:3000   (Run "npm run dev")',
        'Frontend Stack:   Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide Icons',
        'Backend & Data:   Firebase Auth & Cloud Firestore (User & Course Data), Supabase (Storage)',
        'AI Engine:        Agnes AI / Gemini 3.0 Flash with Structured Output Schemas & RAG Vector Retrieval'
    ])
    
    output_path = os.path.join(os.path.dirname(__file__), 'EduPilot_AI_Judge_Presentation_Guide.pdf')
    pdf.output(output_path)
    print(f'PDF successfully generated at: {output_path}')

if __name__ == '__main__':
    build_pdf()
