import Course from '../models/courseModel.js';
import Lesson from '../models/lessonModel.js';

// ---- PUBLIC COURSE CATALOGUE ----
// GET /courses
// No auth required. Anyone can browse published courses.
export const getPublicCourseCatalog = async (req, res, next) => {
            try {
                        const page = parseInt(req.query.page) || 1;
                        const limit = parseInt(req.query.limit) || 10;
                        const skip = (page - 1) * limit;

                        const filter = { isPublished: true }; // never expose unpublished courses publicly

                        if (req.query.category) filter.category = req.query.category;
                        if (req.query.level) filter.level = req.query.level;
                        if (req.query.minPrice || req.query.maxPrice) {
                                    filter.price = {};
                                    if (req.query.minPrice) filter.price.$gte = parseInt(req.query.minPrice);
                                    if (req.query.maxPrice) filter.price.$lte = parseInt(req.query.maxPrice);
                        }

                        // search by title or description
                        // e.g. GET /courses?search=react
                        if (req.query.search) {
                                    // escape regex special characters so a user's search text
                                    // (e.g. "c++", "a.b") can't break or hijack the query
                                    const escaped = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                    const searchRegex = new RegExp(escaped, 'i'); // case-insensitive

                                    filter.$or = [
                                                { title: searchRegex },
                                                { description: searchRegex }
                                    ];
                        }

                        const courses = await Course.find(filter)
                                    .populate('instructorId', 'name avatar')
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

// ---- PUBLIC SINGLE COURSE DETAIL ----
// GET /courses/:courseId
// No auth required.
export const getPublicCourseDetail = async (req, res, next) => {
            try {
                        const { courseId } = req.params;

                        // only return the course if it's actually published —
                        // an unpublished/draft course should behave as if it doesn't exist
                        // to a public, unauthenticated visitor
                        const course = await Course.findOne({
                                    _id: courseId,
                                    isPublished: true
                        }).populate('instructorId', 'name avatar');

                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found"
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

// ---- PUBLIC PREVIEW LESSONS ----
// GET /courses/:courseId/lessons
// No auth required. Only returns lessons marked isPreview: true,
// and only safe metadata — never the full lesson set, and no
// gated resources for non-preview lessons.
export const getPublicCourseLessons = async (req, res, next) => {
            try {
                        const { courseId } = req.params;

                        // confirm the course exists and is published first —
                        // same reasoning as getPublicCourseDetail
                        const course = await Course.findOne({
                                    _id: courseId,
                                    isPublished: true
                        });

                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found"
                                    });
                        }

                        // only preview lessons, sorted by their position in the course
                        const previewLessons = await Lesson.find({
                                    courseId,
                                    isPreview: true
                        })
                                    .select('title order duration videoUrl isPreview')
                                    .sort({ order: 1 });

                        return res.status(200).json({
                                    success: true,
                                    data: previewLessons
                        });

            } catch (error) {
                        next(error);
            }
};