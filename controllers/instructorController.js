import Course from '../models/courseModel.js';
import Lesson from '../models/lessonModel.js';
import Quiz from '../models/quizModel.js';
import QuizResult from '../models/quizresultModel.js';
import Enrollment from '../models/enrollmentModel.js';
import InstructorProfile from '../models/instructorModel.js';
import cloudinary from '../config/cloudinary.js';
import { deleteFromCloudinary, getPublicIdFromUrl } from '../utils/cloudinaryHelper.js';


// ---- INSTRUCTOR DASHBOARD ----
// GET /api/instructor/dashboard
export const getInstructorDashboard = async (req, res, next) => {
            try {
                        // get all courses by this instructor
                        const courses = await Course.find({ instructor: req.user.id });

                        // total students across all courses
                        const totalStudents = courses.reduce(
                                    (total, course) => total + course.enrolledStudents.length, 0
                        );

                        // total published courses
                        const publishedCourses = courses.filter(c => c.isPublished).length;

                        // total draft courses
                        const draftCourses = courses.filter(c => !c.isPublished).length;

                        // get recent enrollments across all instructor courses
                        const courseIds = courses.map(c => c._id);
                        const recentEnrollments = await Enrollment.find({
                                    course: { $in: courseIds }
                        })
                                    .populate('student', 'name email avatar')
                                    .populate('course', 'title')
                                    .sort({ createdAt: -1 })
                                    .limit(5);

                        return res.status(200).json({
                                    success: true,
                                    data: {
                                                totalCourses: courses.length,
                                                publishedCourses,
                                                draftCourses,
                                                totalStudents,
                                                recentEnrollments
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// ---- COURSE CREATION AND MANAGEMENT ----

// POST /api/instructor/courses
export const createCourse = async (req, res, next) => {
            try {
                        const { title, description, category, level, price, instructorId } = req.body;

                        const thumbnail = req.file ? req.file.path : null;

                        const course = await Course.create({
                                    title,
                                    description,
                                    category,
                                    level,
                                    price,
                                    thumbnail,
                                    instructorId: req.user.id,
                                    isPublished: false // draft by default
                        });

                        // update instructor profile total courses
                        await InstructorProfile.findOneAndUpdate(
                                    { user: req.user.id },
                                    { $inc: { totalCourses: 1 } }
                        );

                        return res.status(201).json({
                                    success: true,
                                    message: "Course created successfully",
                                    data: course
                        });

            } catch (error) {
                        next(error);
            }
};

// GET /api/instructor/courses
export const getInstructorCourses = async (req, res, next) => {
            try {
                        // pagination
                        const page = parseInt(req.query.page) || 1;
                        const limit = parseInt(req.query.limit) || 10;
                        const skip = (page - 1) * limit;

                        const filter = { instructor: req.user.id };

                        // filter by published status
                        if (req.query.isPublished !== undefined) {
                                    filter.isPublished = req.query.isPublished === 'true';
                        }

                        const courses = await Course.find(filter)
                                    .skip(skip)
                                    .limit(limit)
                                    .sort({ createdAt: -1 });

                        const total = await Course.countDocuments(filter);

                        return res.status(200).json({
                                    success: true,
                                    data: courses,
                                    pagination: {
                                                total,
                                                page,
                                                limit,
                                                totalPages: Math.ceil(total / limit)
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// GET /api/instructor/courses/:courseId
export const getSingleInstructorCourse = async (req, res, next) => {
            try {
                        const course = await Course.findById(req.params.courseId)
                                    .populate('lessonsId')
                                    .populate('enrolledStudentsId', 'name email avatar');

                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found"
                                    });
                        }

                        // make sure this course belongs to the instructor
                        if (course.instructorId.toString() !== req.user.id.toString()) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not authorized to view this course"
                                    });
                        }

                        return res.status(200).json({
                                    success: true,
                                    data: course
                        });

            } catch (error) {
                        next(error);
            }
};

// PUT /api/instructor/courses/:courseId
export const updateCourse = async (req, res, next) => {
            try {
                        const course = await Course.findById(req.params.courseId);

                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found"
                                    });
                        }

                        // make sure this course belongs to the instructor
                        if (course.instructorId.toString() !== req.user.id.toString()) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not authorized to update this course"
                                    });
                        }
                        // if new thumbnail uploaded delete old one from cloudinary
                        if (req.file && course.thumbnail) {
                                    const publicId = getPublicIdFromUrl(course.thumbnail);
                                    await deleteFromCloudinary(publicId, 'image');
                        }

                        const updateData = { ...req.body };
                        if (req.file) updateData.thumbnail = req.file.path; // new cloudinary URL

                        const updatedCourse = await Course.findByIdAndUpdate(
                                    req.params.courseId,
                                    { $set: req.body },
                                    { new: true, runValidators: true }
                        );

                        return res.status(200).json({
                                    success: true,
                                    message: "Course updated successfully",
                                    data: updatedCourse
                        });

            } catch (error) {
                        next(error);
            }
};

// DELETE /api/instructor/courses/:courseId
export const deleteCourse = async (req, res, next) => {
            try {
                        const course = await Course.findById(req.params.courseId);

                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found"
                                    });
                        }

                        // make sure this course belongs to the instructor
                        if (course.instructor.toString() !== req.user.id.toString()) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not authorized to delete this course"
                                    });
                        }

                        // delete all lessons in this course
                        await Lesson.deleteMany({ course: req.params.courseId });

                        // delete all quizzes in this course
                        await Quiz.deleteMany({ course: req.params.courseId });

                        // delete the course
                        await Course.findByIdAndDelete(req.params.courseId);

                        // update instructor profile total courses
                        await InstructorProfile.findOneAndUpdate(
                                    { user: req.user.id },
                                    { $inc: { totalCourses: -1 } }
                        );

                        return res.status(200).json({
                                    success: true,
                                    message: "Course deleted successfully"
                        });

            } catch (error) {
                        next(error);
            }
};

// PATCH /api/instructor/courses/:courseId/publish
export const togglePublishCourse = async (req, res, next) => {
            try {
                        const course = await Course.findById(req.params.courseId);

                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found"
                                    });
                        }

                        // make sure this course belongs to the instructor
                        if (course.instructorId.toString() !== req.user.id.toString()) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not authorized to publish this course"
                                    });
                        }

                        // check if course has at least one lesson before publishing
                        if (!course.isPublished && course.lessonsId.length === 0) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "Add at least one lesson before publishing"
                                    });
                        }

                        // toggle publish status
                        course.isPublished = !course.isPublished;
                        await course.save();

                        return res.status(200).json({
                                    success: true,
                                    message: `Course ${course.isPublished ? 'published' : 'unpublished'} successfully`,
                                    data: course
                        });

            } catch (error) {
                        next(error);
            }
};



// ---- LESSON MANAGEMENT ----
export const createLesson = async (req, res, next) => {
            try {
                        if (!req.file) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "Video is required",
                                    });
                        }
                        // console.log(req.file)

                        const { title, duration, order, isPreview } = req.body;
                        // console.log(req.body)

                        const course = await Course.findById(req.params.courseId);
                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found",
                                    });
                        }

                        if (course.instructorId.toString() !== req.user.id.toString()) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not authorized to add lessons to this course",
                                    });
                        }

                        const videoUrl = req.file.path;
                        // console.log(videoUrl)        // Cloudinary hosted URL
                        // const videoPublicId = req.file.filename; // Cloudinary public_id

                        try {
                                    const lesson = await Lesson.create({
                                                title,
                                                videoUrl,
                                                duration,
                                                order,
                                                isPreview: isPreview === "true",
                                                resources: [],
                                                courseId: req.params.courseId, // matches Lesson schema
                                    });

                                    course.lessonsId.push(lesson._id); // matches Course schema
                                    await course.save();

                                    return res.status(201).json({
                                                success: true,
                                                message: "Lesson created successfully",
                                                data: lesson,
                                    });
                        } catch (dbError) {
                                    await cloudinary.uploader.destroy(req.file.filename, {
                                                resource_type: "video",
                                    });
                                    console.log(dbError)
                                    throw dbError;
                        }
            } catch (error) {
                        console.log(error)
                        next(error);
            }
};



// POST /api/instructor/courses/:courseId/lessons
// export const createLesson = async (req, res, next) => {
//             try {
//                         const { title, duration, order, isPreview, resources } = req.body;
//                         // console.log("video file", req.file)

//                         // check if course exists and belongs to instructor
//                         const course = await Course.findById(req.params.courseId);
//                         if (!course) {
//                                     return res.status(404).json({
//                                                 success: false,
//                                                 message: "Course not found"
//                                     });
//                         }

//                         if (course.instructorId.toString() !== req.user.id.toString()) {
//                                     return res.status(403).json({
//                                                 success: false,
//                                                 message: "You are not authorized to add lessons to this course"
//                                     });
//                         }

//                         if (!req.file) {
//                                     return res.status(400).json({
//                                                 success: false,
//                                                 message: "Video is required"
//                                     });
//                         }

//                         const videoUrl = req.file.path; // cloudinary URL
//                         // console.log("video", videoUrl);
//                         // create the lesson
//                         const lesson = await Lesson.create({
//                                     title,
//                                     videoUrl,
//                                     duration,
//                                     order,
//                                     isPreview: isPreview || false,
//                                     resources: [],
//                                     courseId: req.params.courseId
//                         });

//                         // add lesson to course
//                         await Course.findByIdAndUpdate(req.params.courseId, {
//                                     $push: { lessonsId: lesson._id }
//                         });

//                         return res.status(201).json({
//                                     success: true,
//                                     message: "Lesson created successfully",
//                                     data: lesson
//                         });

//             } catch (error) {
//                         next(error);
//             }
// };



// GET /api/instructor/courses/:courseId/lessons
export const getCourseLessons = async (req, res, next) => {
            try {
                        // check if course belongs to instructor
                        const course = await Course.findById(req.params.courseId);
                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found"
                                    });
                        }

                        if (course.instructorId.toString() !== req.user.id.toString()) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not authorized to view these lessons"
                                    });
                        }

                        const lessons = await Lesson.find({ course: req.params.courseId })
                                    .sort({ order: 1 });

                        return res.status(200).json({
                                    success: true,
                                    data: lessons
                        });

            } catch (error) {
                        next(error);
            }
};

// PUT /api/instructor/lessons/:lessonId
export const updateLesson = async (req, res, next) => {
            try {
                        const lesson = await Lesson.findById(req.params.lessonId);
                        if (!lesson) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Lesson not found"
                                    });
                        }

                        // check if course belongs to instructor
                        const course = await Course.findById(lesson.course);
                        if (course.instructor.toString() !== req.user.id.toString()) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not authorized to update this lesson"
                                    });
                        }

                        const updatedLesson = await Lesson.findByIdAndUpdate(
                                    req.params.lessonId,
                                    { $set: req.body },
                                    { new: true, runValidators: true }
                        );

                        return res.status(200).json({
                                    success: true,
                                    message: "Lesson updated successfully",
                                    data: updatedLesson
                        });

            } catch (error) {
                        next(error);
            }
};

// DELETE /api/instructor/lessons/:lessonId
export const deleteLesson = async (req, res, next) => {
            try {
                        const lesson = await Lesson.findById(req.params.lessonId);
                        if (!lesson) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Lesson not found"
                                    });
                        }

                        // check if course belongs to instructor
                        const course = await Course.findById(lesson.courseId);
                        if (course.instructorId.toString() !== req.user.id.toString()) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not authorized to delete this lesson"
                                    });
                        }

                        // remove lesson from course
                        await Course.findByIdAndUpdate(lesson.course, {
                                    $pull: { lessons: lesson._id }
                        });

                        // delete the lesson
                        await Lesson.findByIdAndDelete(req.params.lessonId);

                        return res.status(200).json({
                                    success: true,
                                    message: "Lesson deleted successfully"
                        });

            } catch (error) {
                        next(error);
            }
};
// POST /api/instructor/lessons/:lessonId/resources
// upload pdf, doc, ppt, xls, zip to a lesson
export const uploadLessonResource = async (req, res, next) => {
            try {

                        // check if file was uploaded
                        if (!req.file) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "Resource file is required"
                                    });
                        }

                        const { title } = req.body;

                        // find lesson
                        const lesson = await Lesson.findById(req.params.lessonId);
                        if (!lesson) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Lesson not found"
                                    });
                        }

                        // check course belongs to instructor
                        const course = await Course.findById(lesson.courseId);
                        if (course.instructorId.toString() !== req.user.id.toString()) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not authorized to add resources to this lesson"
                                    });
                        }

                        // get file extension
                        const fileExtension = req.file.originalname.split('.').pop().toLowerCase();

                        // build resource object
                        const resource = {
                                    title,
                                    fileUrl: req.file.path,   // cloudinary URL
                                    fileType: fileExtension
                        };

                        // push resource to lesson
                        lesson.resources.push(resource);
                        await lesson.save();

                        return res.status(201).json({
                                    success: true,
                                    message: "Resource uploaded successfully",
                                    data: resource
                        });

            } catch (error) {
                        next(error);
            }
};

// DELETE /api/instructor/lessons/:lessonId/resources/:resourceId
// delete a resource from a lesson
export const deleteLessonResource = async (req, res, next) => {
            try {
                        const lesson = await Lesson.findById(req.params.lessonId);
                        if (!lesson) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Lesson not found"
                                    });
                        }

                        // check course belongs to instructor
                        const course = await Course.findById(lesson.course);
                        if (course.instructor.toString() !== req.user.id.toString()) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not authorized to delete resources from this lesson"
                                    });
                        }

                        // find the resource
                        const resource = lesson.resources.id(req.params.resourceId);
                        if (!resource) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Resource not found"
                                    });
                        }

                        // delete from cloudinary
                        const publicId = getPublicIdFromUrl(resource.fileUrl);
                        await deleteFromCloudinary(publicId, 'raw');

                        // remove from lesson
                        resource.deleteOne();
                        await lesson.save();

                        return res.status(200).json({
                                    success: true,
                                    message: "Resource deleted successfully"
                        });

            } catch (error) {
                        next(error);
            }
};

// ---- QUIZ CREATION ----

// POST /api/instructor/courses/:courseId/quizzes
export const createQuiz = async (req, res, next) => {
            try {
                        const { title, lessonId, questions, passingScore, timeLimit } = req.body;

                        // check if course belongs to instructor
                        const course = await Course.findById(req.params.courseId);
                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found"
                                    });
                        }

                        if (course.instructorId.toString() !== req.user.id.toString()) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not authorized to add quizzes to this course"
                                    });
                        }

                        const quiz = await Quiz.create({
                                    title,
                                    courseId: req.params.courseId,
                                    lesson: lessonId,
                                    questions,
                                    passingScore,
                                    timeLimit
                        });

                        return res.status(201).json({
                                    success: true,
                                    message: "Quiz created successfully",
                                    data: quiz
                        });

            } catch (error) {
                        next(error);
            }
};

// GET /api/instructor/courses/:courseId/quizzes
export const getCourseQuizzes = async (req, res, next) => {
            try {
                        // check if course belongs to instructor
                        const course = await Course.findById(req.params.courseId);
                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found"
                                    });
                        }

                        if (course.instructor.toString() !== req.user.id.toString()) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not authorized to view these quizzes"
                                    });
                        }

                        const quizzes = await Quiz.find({ course: req.params.courseId });

                        return res.status(200).json({
                                    success: true,
                                    data: quizzes
                        });

            } catch (error) {
                        next(error);
            }
};

// DELETE /api/instructor/quizzes/:quizId
export const deleteQuiz = async (req, res, next) => {
            try {
                        const quiz = await Quiz.findById(req.params.quizId);
                        if (!quiz) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Quiz not found"
                                    });
                        }

                        // check if course belongs to instructor
                        const course = await Course.findById(quiz.course);
                        if (course.instructor.toString() !== req.user.id.toString()) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not authorized to delete this quiz"
                                    });
                        }

                        await Quiz.findByIdAndDelete(req.params.quizId);

                        return res.status(200).json({
                                    success: true,
                                    message: "Quiz deleted successfully"
                        });

            } catch (error) {
                        next(error);
            }
};

// ---- STUDENT PROGRESS MONITORING ----

// GET /api/instructor/courses/:courseId/students
export const getCourseStudents = async (req, res, next) => {
            try {
                        // check if course belongs to instructor
                        const course = await Course.findById(req.params.courseId);
                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found"
                                    });
                        }

                        if (course.instructor.toString() !== req.user.id.toString()) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not authorized to view students for this course"
                                    });
                        }

                        // get all enrollments for this course
                        const enrollments = await Enrollment.find({ course: req.params.courseId })
                                    .populate('student', 'name email avatar')
                                    .sort({ createdAt: -1 });

                        return res.status(200).json({
                                    success: true,
                                    data: enrollments
                        });

            } catch (error) {
                        next(error);
            }
};

// GET /api/instructor/courses/:courseId/students/:studentId/progress
export const getStudentProgress = async (req, res, next) => {
            try {
                        // check if course belongs to instructor
                        const course = await Course.findById(req.params.courseId);
                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found"
                                    });
                        }

                        if (course.instructor.toString() !== req.user.id.toString()) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not authorized to view this student's progress"
                                    });
                        }

                        // get enrollment for this student and course
                        const enrollment = await Enrollment.findOne({
                                    student: req.params.studentId,
                                    course: req.params.courseId
                        })
                                    .populate('student', 'name email avatar')
                                    .populate('completedLessons', 'title order');

                        if (!enrollment) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Student is not enrolled in this course"
                                    });
                        }

                        // get quiz results for this student in this course
                        const quizResults = await QuizResult.find({
                                    student: req.params.studentId,
                                    course: req.params.courseId
                        }).populate('quiz', 'title passingScore');

                        const totalLessons = await Lesson.countDocuments({
                                    course: req.params.courseId
                        });

                        return res.status(200).json({
                                    success: true,
                                    data: {
                                                student: enrollment.student,
                                                progress: enrollment.progress,
                                                isCompleted: enrollment.isCompleted,
                                                completedAt: enrollment.completedAt,
                                                completedLessons: enrollment.completedLessons,
                                                totalLessons,
                                                quizResults
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};