import User from '../models/userModel.js';
import InstructorApplication from '../models/instructorApplicationModel.js';
import InstructorProfile from '../models/instructorModel.js';
import sendEmail from '../utils/sendEmail.js';

// ---- STUDENT SIDE ----

// POST /api/instructor-application/apply
export const applyToBeInstructor = async (req, res, next) => {
            try {
                        const { motivation, expertise, experience, portfolioLinks, qualifications } = req.body;


                        // check if user is already an instructor
                        if (req.user.role === 'instructor') {
                                    return res.status(400).json({
                                                success: false,
                                                message: "You are already an instructor"
                                    });
                        }

                        // check if user is an admin
                        if (req.user.role === 'admin') {
                                    return res.status(400).json({
                                                success: false,
                                                message: "Admins cannot apply to become instructors"
                                    });
                        }

                        // check if user already has an application
                        const existingApplication = await InstructorApplication.findOne({
                                    user: req.user.id
                        });

                        if (existingApplication) {
                                    if (existingApplication.status === 'pending') {
                                                return res.status(400).json({
                                                            success: false,
                                                            message: "You already have a pending application. Please wait for review"
                                                });
                                    }

                                    if (existingApplication.status === 'approved') {
                                                return res.status(400).json({
                                                            success: false,
                                                            message: "Your application has already been approved"
                                                });
                                    }

                                    // if rejected allow them to reapply
                                    if (existingApplication.status === 'rejected') {
                                                await InstructorApplication.findByIdAndDelete(existingApplication._id);
                                    }
                        }

                        // create application
                        const application = await InstructorApplication.create({
                                    user: req.user.id,
                                    motivation,
                                    expertise,
                                    experience,
                                    portfolioLinks,
                                    qualifications
                        });

                        // notify all admins by email
                        const admins = await User.find({
                                    role: 'admin',
                                    isActive: true
                        }).select('email');

                        for (const admin of admins) {
                                    await sendEmail({
                                                to: admin.email,
                                                subject: 'New Instructor Application',
                                                html: `
          <h2>New Instructor Application</h2>
          <p>A new instructor application has been submitted.</p>
          <p><strong>Applicant:</strong> ${req.user.name}</p>
          <p><strong>Email:</strong> ${req.user.email}</p>
          <p><strong>Expertise:</strong> ${expertise.join(', ')}</p>
          <p>Please login to review the application.</p>
        `
                                    });
                        }

                        return res.status(201).json({
                                    success: true,
                                    message: "Application submitted successfully. We will review and get back to you",
                                    data: application
                        });

            } catch (error) {
                        next(error);
            }
};


// GET /api/instructor-application/my-application
export const getMyApplication = async (req, res, next) => {
            try {
                        const application = await InstructorApplication.findOne({
                                    user: req.user.id
                        });

                        if (!application) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "You have not submitted an instructor application"
                                    });
                        }

                        return res.status(200).json({
                                    success: true,
                                    data: application
                        });

            } catch (error) {
                        next(error);
            }
};

// DELETE /api/instructor-application/withdraw
export const withdrawApplication = async (req, res, next) => {
            try {
                        const application = await InstructorApplication.findOne({
                                    user: req.user.id
                        });

                        if (!application) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "No application found"
                                    });
                        }

                        // can only withdraw pending applications
                        if (application.status !== 'pending') {
                                    return res.status(400).json({
                                                success: false,
                                                message: `Cannot withdraw a ${application.status} application`
                                    });
                        }

                        await InstructorApplication.findByIdAndDelete(application._id);

                        return res.status(200).json({
                                    success: true,
                                    message: "Application withdrawn successfully"
                        });

            } catch (error) {
                        next(error);
            }
};

// ---- ADMIN SIDE ----

// GET /api/instructor-application/all
export const getAllApplications = async (req, res, next) => {
            try {
                        const page = parseInt(req.query.page) || 1;
                        const limit = parseInt(req.query.limit) || 10;
                        const skip = (page - 1) * limit;

                        const filter = {};
                        if (req.query.status) filter.status = req.query.status;

                        const applications = await InstructorApplication.find(filter)
                                    .populate('user', 'name email avatar createdAt')
                                    .populate('reviewedBy', 'name email')
                                    .skip(skip)
                                    .limit(limit)
                                    .sort({ createdAt: -1 });

                        const total = await InstructorApplication.countDocuments(filter);

                        return res.status(200).json({
                                    success: true,
                                    data: applications,
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

// GET /api/instructor-application/:applicationId
export const getSingleApplication = async (req, res, next) => {
            try {
                        const application = await InstructorApplication.findById(
                                    req.params.applicationId
                        ).populate('user', 'name email avatar enrolledCourses createdAt');

                        if (!application) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Application not found"
                                    });
                        }

                        return res.status(200).json({
                                    success: true,
                                    data: application
                        });

            } catch (error) {
                        next(error);
            }
};

// PATCH /api/instructor-application/:applicationId/review
export const reviewApplication = async (req, res, next) => {
            try {
                        const { status, rejectionReason } = req.body;

                        const application = await InstructorApplication.findById(
                                    req.params.applicationId
                        ).populate('user', 'name email');

                        if (!application) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Application not found"
                                    });
                        }

                        // can only review pending applications
                        if (application.status !== 'pending') {
                                    return res.status(400).json({
                                                success: false,
                                                message: `Application has already been ${application.status}`
                                    });
                        }

                        // update application
                        application.status = status;
                        application.reviewedBy = req.user.id;
                        application.reviewedAt = new Date();
                        if (rejectionReason) application.rejectionReason = rejectionReason;
                        await application.save();

                        // ---- IF APPROVED ----
                        if (status === 'approved') {
                                    // change user role to instructor
                                    await User.findByIdAndUpdate(application.user._id, {
                                                role: 'instructor'
                                    });

                                    // create instructor profile automatically
                                    const existingProfile = await InstructorProfile.findOne({
                                                user: application.user._id
                                    });

                                    if (!existingProfile) {
                                                await InstructorProfile.create({
                                                            user: application.user._id,
                                                            expertise: application.expertise
                                                });
                                    }

                                    // send approval email
                                    await sendEmail({
                                                to: application.user.email,
                                                subject: 'Instructor Application Approved',
                                                html: `
          <h2>Congratulations! 🎉</h2>
          <p>Hello <strong>${application.user.name}</strong>,</p>
          <p>Your application to become an instructor has been
          <strong>approved</strong>!</p>
          <p>You can now login and start creating courses.</p>
          <p>Here is what you can do now:</p>
          <ul>
            <li>Create and publish courses</li>
            <li>Add lessons and quizzes</li>
            <li>Monitor student progress</li>
          </ul>
          <p>Welcome to the instructor community!</p>
        `
                                    });
                        }

                        // ---- IF REJECTED ----
                        if (status === 'rejected') {
                                    // send rejection email
                                    await sendEmail({
                                                to: application.user.email,
                                                subject: 'Instructor Application Update',
                                                html: `
          <h2>Application Update</h2>
          <p>Hello <strong>${application.user.name}</strong>,</p>
          <p>We have reviewed your instructor application and unfortunately
          we are unable to approve it at this time.</p>
          ${rejectionReason
                                                                        ? `<p><strong>Reason:</strong> ${rejectionReason}</p>`
                                                                        : ''
                                                            }
          <p>You are welcome to apply again after addressing the
          above concerns.</p>
          <p>Thank you for your interest.</p>
        `
                                    });
                        }

                        return res.status(200).json({
                                    success: true,
                                    message: `Application ${status} successfully`,
                                    data: application
                        });

            } catch (error) {
                        next(error);
            }
};