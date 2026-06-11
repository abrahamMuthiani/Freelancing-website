const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

const { User, defaultAdmin } = require('./user');
const mpesaRoutes = require('./routes/mpesa');
const Payment = require('./models/payment');
const Proposal = require('./models/Proposal');
const Project = require('./models/project');  
const Notification = require('./models/notification');


const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect('mongodb://localhost:27017/innobridge')
  .then(() => console.log(' MongoDB connected'))
  .catch(err => console.error(' MongoDB connection error:', err));

const insertDefaultAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ email: defaultAdmin.email });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(defaultAdmin.password, 10);
      const admin = new User({
        ...defaultAdmin,
        password: hashedPassword
      });
      await admin.save();
      console.log(` Default admin created: ${defaultAdmin.email}`);
    }
  } catch (err) {
    console.error(' Error inserting default admin:', err);
  }
};
insertDefaultAdmin();

app.use('/api/mpesa', mpesaRoutes);

// =================== AUTH =================== //

app.post('/api/signup', async (req, res) => {
  try {
    const {
      firstName, lastName, email, password, phone,
      fieldOfWork, hoursAvailable, country, city,
      specificSkills, role
    } = req.body;

    const experienceLevel = req.body.experience || req.body.experienceLevel || 'Beginner';

    if (!firstName || !lastName || !email || !password || !country || !hoursAvailable) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const username = firstName.trim().toLowerCase();
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const newUser = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username,
      email: email.trim(),
      phone: phone?.trim() || '',
      password: hashedPassword,
      role: role || 'user',
      fieldOfWork: fieldOfWork?.trim() || '',
      hoursAvailable: Number(hoursAvailable),
      experienceLevel,
      country,
      city: city?.trim() || '',
      specificSkills: Array.isArray(specificSkills)
        ? specificSkills
        : specificSkills ? [specificSkills] : []
    });

    await newUser.save();
    res.status(200).json({ message: 'Signup successful. Please login...' });
  } catch (err) {
    console.error(' Signup error:', err);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

app.post('/api/signup-client', async (req, res) => {
  try {
    const { fullName, email, password, country, company, projectCategory } = req.body;

    if (!fullName || !email || !password || !country || !company || !projectCategory) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const username = fullName.trim().toLowerCase().replace(/\s+/g, '');
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res.status(400).json({ message: 'Email or username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const newUser = new User({
      firstName: fullName.trim().split(' ')[0],
      lastName: fullName.trim().split(' ').slice(1).join(' ') || '',
      username,
      email: email.trim(),
      password: hashedPassword,
      country,
      company,
      role: 'client',
      fieldOfWork: projectCategory
    });

    await newUser.save();
    res.status(201).json({ message: 'Client signup successful' });

  } catch (err) {
    console.error(' Signup-client error:', err);
    res.status(500).json({ message: 'Server error during client signup' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.trim() });
    if (!user) return res.status(400).json({ message: 'User not found.' });

    if (user.isBanned) {
      const now = new Date();
      if (!user.banUntil || now < user.banUntil) {
        return res.status(403).json({ message: `Account is banned until ${user.banUntil ? user.banUntil.toISOString() : 'further notice'}.` });
      } else {
        user.isBanned = false;
        user.banUntil = null;
        await user.save();
      }
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(400).json({ message: 'Incorrect password.' });

    res.status(200).json({
      message: 'Login successful',
      role: user.role,
      redirect:
        user.role === 'freelancer'
          ? '/user-dashboard.html'
          : user.role === 'client'
            ? '/client-dashboard.html'
            : '/',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        fieldOfWork: user.fieldOfWork,
        role: user.role,
        username: user.username,
        city: user.city,
        country: user.country,
        hoursAvailable: user.hoursAvailable,
        experienceLevel: user.experienceLevel,
        specificSkills: user.specificSkills,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(' Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// =================== USER =================== //

app.get('/api/user', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ user });
  } catch (err) {
    console.error(' Get user error:', err);
    res.status(500).json({ message: 'Server error fetching user' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/total-users', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    res.json({ totalUsers });
  } catch (err) {
    console.error('Error fetching total users:', err);
    res.status(500).json({ error: 'Server error while fetching total users' });
  }
});

app.get('/api/admin/profile', async (req, res) => {
  try {
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    res.status(200).json({
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      profileImage: admin.profileImage || '',
      username: admin.username,
      phone: admin.phone,
      createdAt: admin.createdAt
    });
  } catch (err) {
    console.error(' Error fetching admin profile:', err);
    res.status(500).json({ message: 'Server error fetching admin profile' });
  }
});

app.delete('/api/admin/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(' Error deleting user:', err);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

app.post('/api/admin/user/:id/ban', async (req, res) => {
  try {
    const { id } = req.params;
    const { duration, unit } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let banUntilDate = null;

    if (unit === 'lifetime') {
      banUntilDate = new Date('2999-12-31');
    } else {
      const now = new Date();
      const msMap = {
        hours: 3600000,
        days: 86400000,
        weeks: 604800000,
        months: 2592000000
      };
      banUntilDate = new Date(now.getTime() + (duration * (msMap[unit] || 0)));
    }

    user.isBanned = true;
    user.banUntil = banUntilDate;
    await user.save();

    res.json({ message: `User banned until ${banUntilDate}` });
  } catch (err) {
    console.error(' Error banning user:', err);
    res.status(500).json({ message: 'Server error banning user' });
  }
});

app.post('/api/admin/user/:id/unban', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBanned = false;
    user.banUntil = null;
    await user.save();

    res.json({ message: 'User unbanned successfully' });
  } catch (err) {
    console.error(' Error unbanning user:', err);
    res.status(500).json({ message: 'Server error unbanning user' });
  }
});

app.get('/api/users/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const projects = await Project.find({ createdBy: user.email }).sort({ createdAt: -1 }).limit(5);

    res.status(200).json({
      recentProjects: projects,
      activityCount: projects.length
    });
  } catch (err) {
    console.error(' Error fetching user activity:', err);
    res.status(500).json({ message: 'Server error fetching user activity' });
  }
});

app.get('/api/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).lean();
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// =================== PAYMENT / WALLET =================== //

app.get('/api/payment/wallet-balance', async (req, res) => {
  try {
    const walletBalance = {
      balance: 2458.50,
      currency: 'USD'
    };

    res.status(200).json(walletBalance);
  } catch (error) {
    console.error(' Error fetching wallet balance:', error);
    res.status(500).json({ 
      error: 'Failed to fetch wallet balance',
      balance: 0 
    });
  }
});

// =================== PROJECT =================== //

app.post('/api/post-project', async (req, res) => {
  try {
    const {
      title,
      description,
      budget,
      deadline,
      specificSkills,
      attachments,
      clientId
    } = req.body;

    if (!clientId) {
      return res.status(400).json({ message: 'Invalid client ID.' });
    }

    const user = await User.findById(clientId);
    if (!user) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    if (user.role !== 'client') {
      return res.status(403).json({ message: 'Access denied. Only clients can post projects.' });
    }

    const project = new Project({
      title: title.trim(),
      description: description.trim(),
      budget: Number(budget),
      deadline: new Date(deadline),
      skills: Array.isArray(specificSkills) ? specificSkills : specificSkills ? [specificSkills] : [],
      attachments: Array.isArray(attachments) ? attachments : attachments ? [attachments] : [],
      clientId: user._id,
      createdBy: `${user.firstName} ${user.lastName}`.trim(),
      status: 'pending'
    });

    await project.save();
    res.status(200).json({ message: 'Project posted successfully!', project });

  } catch (err) {
    console.error(' Post project error:', err);
    res.status(500).json({ message: 'Server error while posting project' });
  }
});

app.get("/api/projects/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const projects = await Project.find({ clientId: userId }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error("Error fetching user projects:", err);
    res.status(500).json({ error: "Failed to fetch user projects" });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const query = {};

    if (req.query.status) {
      query.status = req.query.status;
    }

    const projects = await Project.find(query)
      .populate("clientId", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json(projects);

  } catch (err) {
    console.error(" Error fetching projects:", err);
    res.status(500).json({ message: "Server error fetching projects" });
  }
});

app.get('/api/projects/recent', async (req, res) => {
  try {
    const recentProjects = await Project.find()
      .populate('clientId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const formattedProjects = recentProjects.map(project => ({
      _id: project._id,
      title: project.title,
      description: project.description,
      createdBy: project.clientId?.email || 'Unknown',
      createdAt: project.createdAt,
      status: project.status,
      budget: project.budget,
      requestedBy: null
    }));

    res.status(200).json(formattedProjects);
  } catch (error) {
    console.error(' Error fetching recent projects:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recent projects',
      message: error.message 
    });
  }
});

app.get('/api/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    console.log('Fetching project with ID:', projectId);

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      console.error(' Invalid ObjectId format:', projectId);
      return res.status(400).json({ message: 'Invalid project ID format' });
    }

    const project = await Project.findById(projectId)
      .populate('clientId', 'firstName lastName email company');

    if (!project) {
      console.error(' Project not found:', projectId);
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log(' Project found:', project.title);
    
    let createdByName = 'Anonymous';
    if (project.clientId && project.clientId.firstName) {
      createdByName = `${project.clientId.firstName} ${project.clientId.lastName || ''}`.trim();
    } else if (project.createdBy) {
      createdByName = project.createdBy;
    }

    const formattedProject = {
      ...project.toObject(),
      createdBy: createdByName,
      clientEmail: project.clientId?.email || 'N/A',
      clientCompany: project.clientId?.company || 'N/A'
    };

    res.status(200).json(formattedProject);
  } catch (err) {
    console.error(' Error fetching project by ID:', err);
    res.status(500).json({ message: 'Server error fetching project' });
  }
});

// =================== PROPOSALS =================== //

// POST - Submit a proposal
app.post('/api/proposals', async (req, res) => {
  try {
    const { projectId, freelancerId, coverLetter, bidAmount, estimatedTime } = req.body;

    console.log('📥 Received proposal submission:', { projectId, freelancerId, bidAmount, estimatedTime });

    if (!projectId || !freelancerId || !coverLetter || !bidAmount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const freelancer = await User.findById(freelancerId);
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }

    const existingProposal = await Proposal.findOne({ projectId, freelancerId });
    if (existingProposal) {
      return res.status(400).json({ message: 'You have already submitted a proposal for this project' });
    }

    let estimatedDeliveryDays = 7;
    if (estimatedTime) {
      const timeMap = {
        '1-week': 7,
        '2-weeks': 14,
        '1-month': 30,
        '2-months': 60,
        '3-months': 90,
        'custom': 30
      };
      estimatedDeliveryDays = timeMap[estimatedTime] || 7;
    }

    const newProposal = new Proposal({
      projectId,
      freelancerId,
      clientId: project.clientId,
      coverLetter,
      bidAmount: parseFloat(bidAmount),
      estimatedDeliveryDays,
      status: 'pending'
    });

    await newProposal.save();

    console.log(' Proposal saved successfully:', newProposal._id);

    try {
      await Notification.create({
        recipientId: project.clientId,
        message: `New proposal received from ${freelancer.firstName} ${freelancer.lastName} for "${project.title}"`,
        type: 'proposal'
      });
    } catch (notifError) {
      console.error('⚠️ Failed to create notification:', notifError);
    }

    res.status(201).json({ 
      message: 'Proposal submitted successfully', 
      proposal: newProposal 
    });
  } catch (err) {
    console.error(' Error submitting proposal:', err);
    console.error(' Error stack:', err.stack);
    res.status(500).json({ message: 'Failed to submit proposal', error: err.message });
  }
});

// GET proposals for a specific client
app.get('/api/proposals/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    console.log('Fetching proposals for client:', clientId);

    const proposals = await Proposal.find({ clientId })
      .populate('freelancerId', 'firstName lastName email fieldOfWork experienceLevel')
      .populate('projectId', 'title budget deadline')
      .sort({ createdAt: -1 });

    console.log(` Found ${proposals.length} proposals for client`);

    res.status(200).json(proposals);
  } catch (err) {
    console.error(' Error fetching client proposals:', err);
    res.status(500).json({ message: 'Server error fetching proposals' });
  }
});
// GET proposals submitted by a specific freelancer
app.get('/api/proposals/freelancer/:freelancerId', async (req, res) => {
  try {
    const { freelancerId } = req.params;

    console.log('Fetching proposals for freelancer:', freelancerId);

    const proposals = await Proposal.find({ freelancerId })
      .populate('projectId', 'title budget deadline status')
      .populate('clientId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    console.log(` Found ${proposals.length} proposals for freelancer`);

    res.status(200).json(proposals);
  } catch (err) {
    console.error(' Error fetching freelancer proposals:', err);
    res.status(500).json({ message: 'Server error fetching proposals' });
  }
});

// PUT - Accept a proposal
app.put('/api/proposals/:proposalId/accept', async (req, res) => {
  try {
    const { proposalId } = req.params;

    console.log(' Accepting proposal:', proposalId);

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    // Update proposal status
    proposal.status = 'accepted';
    await proposal.save();

    // Update project with freelancer info and return the updated document
    const updatedProject = await Project.findByIdAndUpdate(
      proposal.projectId, 
      { 
        status: 'in-progress',
        freelancerId: proposal.freelancerId 
      },
      { new: true } // This returns the updated document
    ).populate('freelancerId', 'firstName lastName email');

    if (!updatedProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log(' Project updated successfully:', {
      projectId: updatedProject._id,
      projectTitle: updatedProject.title,
      freelancerId: updatedProject.freelancerId,
      status: updatedProject.status
    });

    // Reject all other pending proposals for this project
    const rejectedResult = await Proposal.updateMany(
      { 
        projectId: proposal.projectId, 
        _id: { $ne: proposalId }, 
        status: 'pending' 
      },
      { status: 'rejected' }
    );

    console.log(` Rejected ${rejectedResult.modifiedCount} other proposals`);

    // Create notification for freelancer
    try {
      await Notification.create({
        recipientId: proposal.freelancerId,
        message: `Your proposal has been accepted!`,
        type: 'proposal_accepted'
      });
    } catch (notifError) {
      console.error('⚠️ Failed to create notification:', notifError);
    }

    console.log(' Proposal accepted successfully');

    res.status(200).json({ 
      message: 'Proposal accepted successfully', 
      proposal,
      project: updatedProject 
    });
  } catch (err) {
    console.error(' Error accepting proposal:', err);
    res.status(500).json({ message: 'Server error accepting proposal' });
  }
});

// PUT - Reject a proposal
app.put('/api/proposals/:proposalId/reject', async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { reason } = req.body;

    console.log(' Rejecting proposal:', proposalId);

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    proposal.status = 'rejected';
    if (reason) {
      proposal.rejectionReason = reason;
    }
    await proposal.save();

    // Create notification for freelancer
    try {
      await Notification.create({
        recipientId: proposal.freelancerId,
        message: `Your proposal was not selected. ${reason ? `Reason: ${reason}` : ''}`,
        type: 'proposal_rejected'
      });
    } catch (notifError) {
      console.error('⚠️ Failed to create notification:', notifError);
    }

    console.log(' Proposal rejected');

    res.status(200).json({ message: 'Proposal rejected', proposal });
  } catch (err) {
    console.error(' Error rejecting proposal:', err);
    res.status(500).json({ message: 'Server error rejecting proposal' });
  }
});

// =================== STATS =================== //

app.get('/api/stats/projects', async (req, res) => {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentCount = await Project.countDocuments({ createdAt: { $gte: startOfThisMonth } });
    const lastMonthCount = await Project.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    const growth = lastMonthCount === 0
      ? 100
      : (((currentCount - lastMonthCount) / lastMonthCount) * 100).toFixed(1);

    res.json({
      activeProjects: currentCount,
      growthRate: Number(growth)
    });
  } catch (err) {
    console.error('Error fetching project stats:', err);
    res.status(500).json({ error: 'Failed to fetch project stats' });
  }
});

app.get('/api/client/stats/:clientId', async (req, res) => {
  try {
    const clientId = req.params.clientId;

    const projectsPosted = await Project.countDocuments({ clientId });
    const projectsCompleted = await Project.countDocuments({ clientId, status: 'completed' });
    const pendingProposals = await Proposal.countDocuments({ clientId, status: 'pending' });
    const freelancersWorkedWith = await Project.distinct('freelancerId', { clientId }).then(arr => arr.length);

    res.json({
      projectsPosted,
      projectsCompleted,
      pendingProposals,
      freelancersWorkedWith
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
});

app.get('/api/top-freelancers', async (req, res) => {
  try {
    const freelancers = await User.find({ role: 'freelancer' })
      .select('fullName skills mainCategory')
      .sort({ experience: -1 })
      .limit(5);

    res.json(freelancers);
  } catch (error) {
    console.error('Error fetching freelancers:', error);
    res.status(500).json({ message: 'Error fetching top freelancers' });
  }
});

app.get('/api/client/projects/:clientId', async (req, res) => {
  try {
    const clientId = req.params.clientId;

    const projects = await Project.find({ clientId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json(projects);
  } catch (err) {
    console.error(' Error fetching client projects:', err);
    res.status(500).json({ message: 'Error fetching client projects' });
  }
});

// =================== NOTIFICATIONS =================== //

app.get("/api/notifications/:userId", async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(30);
    res.status(200).json(notifications);
  } catch (err) {
    console.error(" Fetch notifications error:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

app.put("/api/notifications/:id/read", async (req, res) => {
  try {
    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Notification not found" });
    res.status(200).json({ message: "Notification marked as read" });
  } catch (err) {
    console.error(" Mark-as-read error:", err);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

app.post("/api/notifications", async (req, res) => {
  try {
    const { recipients, message, type } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: "Recipients are required" });
    }

    const createdNotifs = await Promise.all(
      recipients.map(async (id) => {
        const notif = new Notification({ recipientId: id, message, type });
        return await notif.save();
      })
    );

    res.status(201).json({ message: "Notifications created", data: createdNotifs });
  } catch (err) {
    console.error(" Create notifications error:", err);
    res.status(500).json({ message: "Failed to create notifications" });
  }
});

// =================== REPORTS / RECENT ACTIVITIES =================== //

app.get('/api/reports', async (req, res) => {
  try {
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName email role createdAt');

    const recentProjects = await Project.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('clientId', 'firstName lastName email');

    const recentProposals = await Proposal.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('freelancerId', 'firstName lastName email');

    res.json({
      recentUsers,
      recentProjects,
      recentProposals
    });
  } catch (err) {
    console.error(' Error fetching reports:', err);
    res.status(500).json({ message: 'Server error fetching reports' });
  }
});

// =================== PROJECT APPROVAL / REJECTION =================== //

app.post('/api/projects/approve/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    project.status = 'open';
    await project.save();

    res.json({ message: 'Project approved successfully', project });
  } catch (err) {
    console.error(' Error approving project:', err);
    res.status(500).json({ message: 'Server error approving project' });
  }
});

app.post('/api/projects/reject/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    project.status = 'rejected';
    await project.save();

    res.json({ message: 'Project rejected successfully', project });
  } catch (err) {
    console.error(' Error rejecting project:', err);
    res.status(500).json({ message: 'Server error rejecting project' });
  }
});
// GET proposals submitted by a specific freelancer
app.get('/api/proposals/freelancer/:freelancerId', async (req, res) => {
  try {
    const { freelancerId } = req.params;
    
    const proposals = await Proposal.find({ freelancerId })
      .populate('projectId', 'title budget deadline status')
      .populate('clientId', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.status(200).json(proposals);
  } catch (err) {
    console.error(' Error fetching freelancer proposals:', err);
    res.status(500).json({ message: 'Server error fetching proposals' });
  }
});

// =================== FRONTEND =================== //

const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// =================== START SERVER =================== //

app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});