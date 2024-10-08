const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/admin.js');
const crypto = require('crypto');
const dotenv = require('dotenv');
const AdminCredentials = require('../models/Admin/Admin');
const salaryTransaction = require('../models/salaryTransaction.js');
dotenv.config();

const generateReferralCode = () => {
  const randomNumber = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number
  return `EM${randomNumber}`;
};



// exports.signup = async (req, res) => {
//   try {
//     const { mobileNumber,email, password, name, referredBy, answer } = req.body;

//     // Generate a referral code
//     const referralCode = generateReferralCode();
//     const newUser = new User({
//       mobileNumber,
//       email,
//       userName:name,
//       password: password.trim(),  // Store the original password
//       referralCode,
//       referredBy,
//       answer
//     });
    
//     await newUser.save();
//     const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);
//     res.status(201).json({newUser, token });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };



exports.signup = async (req, res) => {
  const { email, mobileNumber, password, referredBy, preferredSide } = req.body;
 
  console.log("dataa=>>>", req.body);

  try {
    // Check if the email already exists in the database
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists." });
    }

    // Check if the phone number already exists in the database
    const existingPhone = await User.findOne({ mobileNumber });
    if (existingPhone) {
      return res.status(400).json({ message: "Phone number already exists." });
    }

    // 1. Check if this is the first user (no users in the system)
    const userCount = await User.countDocuments();
    if (userCount === 0) {

      // If this is the first user, no need for referredBy or preferredSide
      const newUser = new User({
        email,
        mobileNumber,
        password,
        referralCode: generateReferralCode(),
        // referralCode: walletAddress,
      });

      await newUser.save();
      return res
        .status(201)
        .json({ message: "First user successfully created!", user: newUser });
    }

    let parentUser;

    // 2. If referredBy is provided, find the parent by referral code
    if (referredBy) {
      parentUser = await User.findOne({ referralCode: referredBy });
      if (!parentUser) {
        return res.status(400).json({ message: "Invalid referral code." });
      }
    }else{
      return res
        .status(400)
        .json({ message: "Referral Code is Required" })

    }

    // 4. Ensure the preferredSide input is valid
    if (preferredSide !== "left" && preferredSide !== "right") {
      return res
        .status(400)
        .json({ message: 'preferredSide must be either "left" or "right".' });
    }

    // 5. Traverse the binary tree to find an available preferredSide based on the user's choice (left or right)
    const targetParent = await findAvailablepreferredSide(
      parentUser,
      preferredSide
    );

    // 6. If no preferredSide is available (this case is unlikely but can occur if something goes wrong)
    if (!targetParent) {
      return res
        .status(500)
        .json({
          message: "No available preferredSide found. Please try again.",
        });
    }



    console.log("wallet inside if ===>", req.body.walletAddress);

    // 7. Create the new user
    const newUser = new User({
      email,
      mobileNumber,
      password,
      referralCode: generateReferralCode(), // Implement a function to generate a unique referral code
      // referralCode: walletAddress, // Implement a function to generate a unique referral code
      referredBy: referredBy,
      // referredBy: targetParent.referralCode,
    });

    // 8. Assign the user to the appropriate preferredSide (left or right)
    if (preferredSide === "left" && !targetParent.leftChild) {
      targetParent.leftChild = newUser._id;
    } else if (preferredSide === "right" && !targetParent.rightChild) {
      targetParent.rightChild = newUser._id;
    }

    // 9. Save both the parent and the new user
    await newUser.save();
    await targetParent.save();

    // 10. Respond with success
    return res
      .status(201)
      .json({ message: "User successfully created!", user: newUser });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};




exports.getAllTeamTree = async (req, res) => {
  const userId = req.params.userId;
  try {
    const user = await User.findById(userId).populate("leftChild rightChild");

    // Create a recursive function to build the tree structure
    const buildUserTree = (user) => {
      if (!user) return null;

      const leftChild = user.leftChild ? buildUserTree(user.leftChild) : null;
      const rightChild = user.rightChild
        ? buildUserTree(user.rightChild)
        : null;

      const tree = {
        name: user.email, // You can change this to any user field like name
        children: [],
      };

      if (leftChild) tree.children.push(leftChild);
      if (rightChild) tree.children.push(rightChild);

      return tree;
    };

    const treeData = buildUserTree(user);

    res.json(treeData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching user tree." });
  }
};

// Recursive function to find an available preferredSide in the binary MLM tree
const findAvailablepreferredSide = async (user, preferredSide) => {
  // Check if the desired preferredSide is available
  if (preferredSide === "left") {
    if (!user.leftChild) {
      return user; // Return the user if the left preferredSide is vacant
    } else {
      // Traverse down the left subtree
      const leftChild = await User.findById(user.leftChild);
      return await findAvailablepreferredSide(leftChild, "left"); // Continue recursively
    }
  } else if (preferredSide === "right") {
    if (!user.rightChild) {
      return user; // Return the user if the right preferredSide is vacant
    } else {
      // Traverse down the right subtree
      const rightChild = await User.findById(user.rightChild);
      return await findAvailablepreferredSide(rightChild, "right"); // Continue recursively
    }
  }
}







exports.login = async (req, res) => {
  try {
    const { mobileNumber, email, password } = req.body;
    const user = await User.findOne(mobileNumber ? { mobileNumber } : { email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    // Validate password
    if (password.trim() !== user.password) {  // Compare original password
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    if (user.blocked) {
      return res.status(400).json({
        success: false,
        message: 'You Are Blocked By Admin. Contact Admin.',
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user._id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        email: user.email,
        referralCode: user.referralCode
      },
      token,
    });
  } catch (err) {
    console.log("Login error:", err);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again later.',
    });
  }
};


exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Log the request body for debugging
    console.log(req.body);

    const adminId = "66e531d85b520cdac7ed935b";

    // Fetch the admin from the database using the adminId, ensure you await this operation
    const admin = await AdminCredentials.findById(adminId);

    // Check if the admin was found
    if (!admin) {
      console.log('Admin not found');
      return res.status(404).send({
        message: "Admin not found" // Send proper error message if admin not found
      });
    }

    // Log the fetched admin for debugging
    console.log('Admin data:', admin);

    // Compare the provided old password with the stored password
    if (admin.password !== oldPassword) {
      return res.status(400).send({
        message: "Old password is incorrect" // Send specific error message if the old password is incorrect
      });
    }

    // Update the password with the new one
    admin.password = newPassword;
    await admin.save();

    // If successful, send a success message
    res.status(200).send({
      message: "Password changed successfully"
    });

  } catch (error) {
    // In case of any other error, log it and send a 500 response with the error message
    console.error('Error changing password:', error);

    res.status(500).send({
      message: "Something went wrong",
      error: error.message // Include the actual error message for debugging
    });
  }
};



exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
   
    
    const admin = await Admin.findOne({ email });
    if (!admin || password !== admin.password) {  // Compare original password
      throw new Error('Invalid credentials');
    }
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
    res.status(200).json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.forgotPasswordController = async (req, res) => {
  try {
    const { mobileNumber, answer, newPassword } = req.body;
    if (!mobileNumber) {
      return res.status(400).send({ message: "MobileNumber is required" });
    }
    if (!answer) {
      return res.status(400).send({ message: "Answer is required" });
    }
    if (!newPassword) {
      return res.status(400).send({ message: "New password is required" });
    }

    const user = await User.findOne({ mobileNumber, answer });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Wrong mobile Number number or answer"
      });
    }

    // Update the password without hashing
    await User.findByIdAndUpdate(user._id, { password: newPassword.trim() });

    res.status(200).send({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Something went wrong",
      error
    });
  }
};
