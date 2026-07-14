from flask import Blueprint, request, jsonify
from database import db
import uuid

api = Blueprint('api', __name__, url_prefix='/api')

# ===== Teacher Routes =====
@api.route('/teacher/create', methods=['POST'])
def create_teacher():
    data = request.json
    teacher_id = str(uuid.uuid4())
    db.add_teacher(teacher_id, data.get('name', 'Teacher'))
    return jsonify({"id": teacher_id, "name": data.get('name')}), 201

@api.route('/teacher/<teacher_id>', methods=['GET'])
def get_teacher(teacher_id):
    teacher = db.get_teacher(teacher_id)
    if teacher:
        classrooms = [db.get_classroom(cid) for cid in teacher.get('classrooms', [])]
        return jsonify({"teacher": teacher, "classrooms": classrooms}), 200
    return jsonify({"error": "Teacher not found"}), 404

# ===== Classroom Routes =====
@api.route('/classroom/create', methods=['POST'])
def create_classroom():
    data = request.json
    classroom_id = str(uuid.uuid4())
    teacher_id = data.get('teacher_id')
    db.add_classroom(classroom_id, data.get('name', 'Classroom'), teacher_id)
    return jsonify({"id": classroom_id, "name": data.get('name')}), 201

@api.route('/classroom/<classroom_id>', methods=['GET'])
def get_classroom(classroom_id):
    classroom = db.get_classroom(classroom_id)
    if classroom:
        students = [db.get_student(sid) for sid in classroom.get('students', [])]
        questions = [db.get_question(qid) for qid in classroom.get('questions', [])]
        return jsonify({"classroom": classroom, "students": students, "questions": questions}), 200
    return jsonify({"error": "Classroom not found"}), 404

@api.route('/classroom/<classroom_id>/add-student', methods=['POST'])
def add_student_to_classroom(classroom_id):
    data = request.json
    student_id = data.get('student_id')
    if db.add_student_to_classroom(classroom_id, student_id):
        return jsonify({"status": "success"}), 200
    return jsonify({"error": "Failed to add student"}), 400

# ===== Student Routes =====
@api.route('/student/create', methods=['POST'])
def create_student():
    data = request.json
    student_id = str(uuid.uuid4())
    classroom_id = data.get('classroom_id')
    db.add_student(student_id, data.get('name', 'Student'), classroom_id)
    return jsonify({"id": student_id, "name": data.get('name')}), 201

@api.route('/student/<student_id>', methods=['GET'])
def get_student(student_id):
    student = db.get_student(student_id)
    if student:
        answers = db.get_answers_by_student(student_id)
        progress = db.get_student_progress(student_id, student.get('classroom_id'))
        return jsonify({"student": student, "answers": answers, "progress": progress}), 200
    return jsonify({"error": "Student not found"}), 404

@api.route('/classroom/<classroom_id>/students', methods=['GET'])
def get_classroom_students(classroom_id):
    students = db.get_students_by_classroom(classroom_id)
    students_with_progress = []
    for student in students:
        progress = db.get_student_progress(student['id'], classroom_id)
        students_with_progress.append({**student, **progress})
    return jsonify(students_with_progress), 200

# ===== Question Routes =====
@api.route('/question/create', methods=['POST'])
def create_question():
    data = request.json
    question_id = str(uuid.uuid4())
    classroom_id = data.get('classroom_id')
    db.add_question(question_id, data.get('text', ''), classroom_id)
    return jsonify({"id": question_id, "text": data.get('text')}), 201

@api.route('/question/<question_id>', methods=['GET'])
def get_question(question_id):
    question = db.get_question(question_id)
    if question:
        answers = db.get_answers_by_question(question_id)
        return jsonify({"question": question, "answers": answers}), 200
    return jsonify({"error": "Question not found"}), 404

@api.route('/classroom/<classroom_id>/questions', methods=['GET'])
def get_classroom_questions(classroom_id):
    questions = db.get_questions_by_classroom(classroom_id)
    return jsonify(questions), 200

# ===== Answer Routes =====
@api.route('/answer/submit', methods=['POST'])
def submit_answer():
    data = request.json
    answer_id = str(uuid.uuid4())
    question_id = data.get('question_id')
    student_id = data.get('student_id')
    answer_text = data.get('answer_text', '')
    is_correct = data.get('is_correct', False)
    feedback = data.get('feedback', '')

    db.add_answer(answer_id, question_id, student_id, answer_text, is_correct, feedback)
    return jsonify({
        "id": answer_id,
        "is_correct": is_correct,
        "feedback": feedback
    }), 201

@api.route('/student/<student_id>/answers', methods=['GET'])
def get_student_answers(student_id):
    answers = db.get_answers_by_student(student_id)
    return jsonify(answers), 200

@api.route('/question/<question_id>/answers', methods=['GET'])
def get_question_answers(question_id):
    answers = db.get_answers_by_question(question_id)
    return jsonify(answers), 200

# ===== Dashboard Routes =====
@api.route('/classroom/<classroom_id>/dashboard', methods=['GET'])
def get_dashboard(classroom_id):
    classroom = db.get_classroom(classroom_id)
    if not classroom:
        return jsonify({"error": "Classroom not found"}), 404

    students = db.get_students_by_classroom(classroom_id)
    students_data = []

    for student in students:
        progress = db.get_student_progress(student['id'], classroom_id)
        students_data.append({
            "id": student['id'],
            "name": student['name'],
            "progress": progress['progress'],
            "correct": progress['correct'],
            "total": progress['total']
        })

    # 전체 통계
    total_students = len(students)
    total_correct = sum(s['correct'] for s in students_data)
    total_answers = sum(s['total'] for s in students_data)
    average_progress = sum(s['progress'] for s in students_data) / total_students if total_students > 0 else 0

    return jsonify({
        "classroom": classroom,
        "students": students_data,
        "stats": {
            "total_students": total_students,
            "average_progress": round(average_progress, 1),
            "total_correct": total_correct,
            "total_answers": total_answers
        }
    }), 200
