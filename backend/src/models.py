from datetime import datetime
from typing import List, Dict, Any

class Question:
    def __init__(self, question_id: str, text: str, subject: str = "수학"):
        self.id = question_id
        self.text = text
        self.subject = subject
        self.created_at = datetime.now()

class Answer:
    def __init__(self, answer_id: str, question_id: str, student_id: str,
                 answer_text: str, is_correct: bool = False, feedback: str = ""):
        self.id = answer_id
        self.question_id = question_id
        self.student_id = student_id
        self.answer_text = answer_text
        self.is_correct = is_correct
        self.feedback = feedback
        self.created_at = datetime.now()

class Student:
    def __init__(self, student_id: str, name: str, classroom_id: str):
        self.id = student_id
        self.name = name
        self.classroom_id = classroom_id
        self.answers: List[Answer] = []
        self.created_at = datetime.now()

    def get_progress(self) -> float:
        if not self.answers:
            return 0
        correct_count = sum(1 for a in self.answers if a.is_correct)
        return (correct_count / len(self.answers)) * 100

class Teacher:
    def __init__(self, teacher_id: str, name: str):
        self.id = teacher_id
        self.name = name
        self.classrooms: List[str] = []
        self.created_at = datetime.now()

class Classroom:
    def __init__(self, classroom_id: str, name: str, teacher_id: str):
        self.id = classroom_id
        self.name = name
        self.teacher_id = teacher_id
        self.students: List[str] = []
        self.questions: List[str] = []
        self.created_at = datetime.now()
