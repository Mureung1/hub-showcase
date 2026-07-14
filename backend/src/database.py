from typing import List, Dict, Any, Optional

class InMemoryDB:
    def __init__(self):
        self.students: Dict[str, Dict[str, Any]] = {}
        self.teachers: Dict[str, Dict[str, Any]] = {}
        self.classrooms: Dict[str, Dict[str, Any]] = {}
        self.questions: Dict[str, Dict[str, Any]] = {}
        self.answers: Dict[str, Dict[str, Any]] = {}

    # Student operations
    def add_student(self, student_id: str, name: str, classroom_id: str) -> bool:
        self.students[student_id] = {
            "id": student_id,
            "name": name,
            "classroom_id": classroom_id
        }
        return True

    def get_student(self, student_id: str) -> Optional[Dict]:
        return self.students.get(student_id)

    def get_students_by_classroom(self, classroom_id: str) -> List[Dict]:
        return [s for s in self.students.values() if s["classroom_id"] == classroom_id]

    # Teacher operations
    def add_teacher(self, teacher_id: str, name: str) -> bool:
        self.teachers[teacher_id] = {
            "id": teacher_id,
            "name": name,
            "classrooms": []
        }
        return True

    def get_teacher(self, teacher_id: str) -> Optional[Dict]:
        return self.teachers.get(teacher_id)

    # Classroom operations
    def add_classroom(self, classroom_id: str, name: str, teacher_id: str) -> bool:
        self.classrooms[classroom_id] = {
            "id": classroom_id,
            "name": name,
            "teacher_id": teacher_id,
            "students": [],
            "questions": []
        }
        if teacher_id in self.teachers:
            self.teachers[teacher_id]["classrooms"].append(classroom_id)
        return True

    def get_classroom(self, classroom_id: str) -> Optional[Dict]:
        return self.classrooms.get(classroom_id)

    def add_student_to_classroom(self, classroom_id: str, student_id: str) -> bool:
        if classroom_id in self.classrooms and student_id in self.students:
            self.classrooms[classroom_id]["students"].append(student_id)
            return True
        return False

    # Question operations
    def add_question(self, question_id: str, text: str, classroom_id: str) -> bool:
        self.questions[question_id] = {
            "id": question_id,
            "text": text,
            "classroom_id": classroom_id
        }
        if classroom_id in self.classrooms:
            self.classrooms[classroom_id]["questions"].append(question_id)
        return True

    def get_question(self, question_id: str) -> Optional[Dict]:
        return self.questions.get(question_id)

    def get_questions_by_classroom(self, classroom_id: str) -> List[Dict]:
        return [q for q in self.questions.values() if q["classroom_id"] == classroom_id]

    # Answer operations
    def add_answer(self, answer_id: str, question_id: str, student_id: str,
                   answer_text: str, is_correct: bool = False, feedback: str = "") -> bool:
        self.answers[answer_id] = {
            "id": answer_id,
            "question_id": question_id,
            "student_id": student_id,
            "answer_text": answer_text,
            "is_correct": is_correct,
            "feedback": feedback
        }
        return True

    def get_answers_by_student(self, student_id: str) -> List[Dict]:
        return [a for a in self.answers.values() if a["student_id"] == student_id]

    def get_answers_by_question(self, question_id: str) -> List[Dict]:
        return [a for a in self.answers.values() if a["question_id"] == question_id]

    def get_student_progress(self, student_id: str, classroom_id: str) -> Dict[str, Any]:
        student_answers = self.get_answers_by_student(student_id)
        if not student_answers:
            return {"progress": 0, "correct": 0, "total": 0}

        correct = sum(1 for a in student_answers if a["is_correct"])
        total = len(student_answers)
        progress = (correct / total * 100) if total > 0 else 0

        return {
            "progress": round(progress, 1),
            "correct": correct,
            "total": total
        }

db = InMemoryDB()
