const cron = require("node-cron");
const axios = require("axios");
const User = require("../models/User");
const Package = require("../models/Package");
const Transaction = require("../models/Transaction");
const Admin = require("../models/admin");
const Payments = require("../models/payment");
const Product = require("../models/addPackage");
const DailyIncomeTransaction = require("../models/dailyIncome");
const LevelIncomeTransaction = require("../models/levelIncome");
const GameIncomeTransaction = require("../models/gameIncome");
const WithdrawPaymentRequest = require("../models/withdrawPaymentRequest");
const ActivationTransaction = require("../models/activationTransaction");
const MatchingIncome = require("../models/matchingIncome")
// Payment Gateway API Details


// Calculate Daily Referral Profits
exports.calculateDailyReferralProfits = async (userId) => {
  try {
    const user = await User.findById(userId);
    const referringUser = await User.findOne({ referralCode: user.referredBy });
    // console.log('user refer ==>',user);
    // console.log('user referring ==>',referringUser);

    if (!referringUser) {
      console.log(
        `Referring user not found for referral code: ${user.referredBy}`
      );
      return;
    }

    // Reset dailyReferralCount if it's a new day
    const today = new Date().setHours(0, 0, 0, 0);
    if (new Date(referringUser.lastReferralDate).setHours(0, 0, 0, 0) < today) {
      referringUser.dailyReferralCount = 0;
      referringUser.lastReferralDate = today;
    }

    // Get package details for the referred user and referring user
    const referredUserPackages = await Product.find({
      _id: { $in: user.packages },
    });
    const referringUserPackages = await Product.find({
      _id: { $in: referringUser.packages },
    });

    // console.log('referredUserPackages ==>',referredUserPackages);
    // console.log('referringUserPackages ==>',referringUserPackages);

    if (
      referredUserPackages.length === 0 ||
      referringUserPackages.length === 0
    ) {
      console.log(
        `No valid packages found for user: ${userId} or referring user: ${referringUser._id}`
      );
      return;
    }

    // Find the max package price for both referred user and referring user
    const referredUserMaxPackage = referredUserPackages.reduce((maxPkg, pkg) =>
      pkg.price > maxPkg.price ? pkg : maxPkg
    );
    const referringUserMaxPackage = referringUserPackages.reduce(
      (maxPkg, pkg) => (pkg.price > maxPkg.price ? pkg : maxPkg)
    );

    // console.log('referredUserMaxPackage ==>',referredUserMaxPackage);
    // console.log('referringUserMaxPackage ==>',referringUserMaxPackage);

    // Give profit only if referred user's max package price is >= referring user's max package price
    // if (referredUserMaxPackage.price >= referringUserMaxPackage.price) {
    referringUser.dailyReferralCount += 1;

    // Determine the profit level (1 to 3)
    const level = Math.min(referringUser.dailyReferralCount, 3);
    const profitMap = {
      1: {
        "A-1-540": 100,
        "B-2-1350": 120,
        "C-3-3150": 150,
        "D-4-6750": 200,
        "E-5-11250": 250,
        "F-6-29250": 300,
      },
      2: {
        "A-1-540": 120,
        "B-2-1350": 150,
        "C-3-3150": 200,
        "D-4-6750": 250,
        "E-5-11250": 300,
        "F-6-29250": 500,
      },
      3: {
        "A-1-540": 150,
        "B-2-1350": 200,
        "C-3-3150": 250,
        "D-4-6750": 300,
        "E-5-11250": 350,
        "F-6-29250": 500,
      },
    };

    // Get the profit amount for the referring user's max package
    const dailyProfit = profitMap[level][referredUserMaxPackage.name] || 0;

    referringUser.wallet += dailyProfit;
    referringUser.earningWallet += dailyProfit;
    referringUser.totalEarning += dailyProfit;
    referringUser.todayEarning += dailyProfit;
    referringUser.lastReferralDate = new Date(); // Update lastReferralDate to current time
    await referringUser.save();

    // console.log('referringUserUpdated ==>',referringUser);
    // console.log("user, amount, fromUser, package ===> ",referringUser._id,dailyProfit,userId,referringUserMaxPackage.name);

    const dailyReferralTransaction = new ReferralIncomeTransaction({
      user: referringUser._id,
      amount: dailyProfit,
      fromUser: user.referralCode,
      package: referredUserMaxPackage.name,
    });
    await dailyReferralTransaction.save();
    //  console.log('dailyReferralProfit ==>',dailyReferralTransaction);

    console.log(
      `Daily profit of ${dailyProfit} added to referring user: ${referringUser._id}`
    );
    // } else {
    //   console.log(`Referred user's package price ${referredUserMaxPackage.price} is less than referring user's package price ${referringUserMaxPackage.price}`);
    // }
  } catch (err) {
    console.error("Error calculating daily referral profits:", err);
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllActiveUsers = async (req, res) => {
  try {
    const users = await User.find({ active: true }).lean();
    res.status(200).json(users);
  } catch (err) {
    console.log("Error fetching active users:", err.message);
    res.status(400).json({ error: err.message });
  }
};

exports.myTeamMembers = async (req, res) => {
  const { id, level } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch users at the specified level
    const levelUsers = await getUsersAtLevel(
      user.referralCode,
      parseInt(level)
    );

    // Manually populate packages
    const levelUsersWithPackages = await Promise.all(
      levelUsers.map(async (teamMember) => {
        const packages = await Product.find({
          _id: { $in: teamMember.packages },
        });
        return { ...teamMember.toObject(), packages };
      })
    );

    console.log(
      `Users at level ${level} with populated packages:`,
      levelUsersWithPackages
    );

    res.status(200).json(levelUsersWithPackages);
  } catch (err) {
    console.error("Error fetching team members:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to get users at a specific level
const getUsersAtLevel = async (referralCode, level) => {
  let usersAtLevel = [];

  for (let i = 1; i <= level; i++) {
    if (i === 1) {
      usersAtLevel = await User.find({ referredBy: referralCode });
    } else {
      const previousLevelUsers = usersAtLevel.map((user) => user.referralCode);
      usersAtLevel = await User.find({
        referredBy: { $in: previousLevelUsers },
      });
    }
  }

  return usersAtLevel;
};






exports.UserMatchingIncome = async (req, res) => {
  console.log("helo================================")
  const userId = req.params.userId;
console.log("bolt level -id =>",userId)
  try {
    const result = await MatchingIncome.find({ user: userId });

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No trading income found for the specified user."
      });
    }

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("Error during retrieving trading income:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching bot level income. Please try again later."
    });
  }
};







exports.UserLevelIncome = async (req, res) => {
  console.log("helo================================")
  const userId = req.params.userId;
console.log("bolt level -id =>",userId)
  try {
    const result = await LevelIncomeTransaction.find({ user: userId });

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No trading income found for the specified user."
      });
    }

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("Error during retrieving trading income:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching bot level income. Please try again later."
    });
  }
};




exports.buyPackage = async (req, res) => {
  console.log("req.body===>", req.body);
  try {
    const pack1 = {
      package_Id: "SMART001",
      name: "Smart Package",
      price: 699,
      des: "E-Book",
      direct_ref_comission: 200,
      levelProfits: [200, 40, 20, 10, 5] // Level profits for pack1
    };

    const pack2 = {
      package_Id: "PRIME002",
      name: "Prime Package",
      price: 1299,
      des: "E-Book Bundle",
      direct_ref_comission: 500,
      levelProfits: [500, 100, 50, 25, 10] // Level profits for pack2
    };

    const { packageId, userId } = req.body;
    console.log("body ===>", req.body);

    // Find the package by ID
    if (!packageId) {
      return res.status(404).json({ error: "Package not found" });
    }

    let packageData;
    if (packageId === "SMART001") {
      packageData = pack1;
    } else if (packageId === "PRIME002") {
      packageData = pack2;
    } else {
      return res.status(404).json({ error: "Package not found" });
    }

    // Find the user who is purchasing the package
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user has enough balance in recharge wallet
    if (user.rechargeWallet < packageData.price) {
      return res.status(400).json({ error: "Insufficient balance in recharge wallet." });
    }

    // Deduct the package price from user's recharge wallet
    user.rechargeWallet -= packageData.price;

    // Update user data
    user.active = true;
    user.packages.push(packageData.package_Id); // Add package to user's purchased packages
    user.purchaseDate.push(Date.now());
    user.business += packageData.price;
    await user.save();

    const all_users = await User.find()
    let all_id=[];

    for(let i=0;i<all_users.length;i++){
      all_id.push(all_users[i]._id)
    } 
    console.log("alll_id--->",all_id);
    
    for(let i=0;i<all_id.length;i++){
      await calculateMatchingIncome(all_id[i])
      console.log("useraaaa===>",all_id[i])
    }

    // Save the updated user
    console.log("user referal code ==>", user.referredBy);
    console.log("user updated", user);

    // Save activation transaction
    const activation = new ActivationTransaction({
      user: user.referralCode,
      email: user.email,
      mobileNumber: user.mobileNumber,
      activateBy: "user",
      package: packageData.name,
      packagePrice: packageData.price,
      wallet: user.rechargeWallet,
    });
    await activation.save();

    console.log(packageData);

    // Distribute profit to parent users based on levels
    let currentUser = user;
    let level = 0;

    // Start with the parent of the user (i.e. the referrer)
    let parentUser = await User.findOne({ referralCode: currentUser.referredBy });

    while (parentUser && level < packageData.levelProfits.length + 15) {
      // Calculate profit to distribute
      const profit = level < 5 ? packageData.levelProfits[level] : 5; // From level 5 onwards, the profit is 5
      
      // Transaction data for level income
      const transactionData = {
        user: parentUser._id,
        amount: level === 0 ? packageData.direct_ref_comission : profit, // Direct referral commission or level profit
        fromUser: currentUser.referralCode, // The user who triggered the profit (the original buyer or the referrer)
        level: level + 1, // Level starts from 1 for direct referral
        package: packageData.name,
        netIncome: parentUser.earningWallet + (level === 0 ? packageData.direct_ref_comission : profit),
      };

      // Create and save the level income transaction
      const levelIncomeTransaction = new LevelIncomeTransaction(transactionData);
      await levelIncomeTransaction.save();

      console.log(`Transaction created for ${parentUser.email} at level ${level + 1}`, transactionData);

      // Add the profit to the parent's wallet
      if (level === 0) {
        // Level 1: Direct referral commission to the parent of the user, not the user themselves
        parentUser.earningWallet += packageData.direct_ref_comission;
      } else {
        // Other levels: Profit to the parent's parent (grandparent, etc.)
        parentUser.earningWallet += profit;
      }

      await parentUser.save();

      console.log(`Profit of ${profit} given to ${parentUser.email} at level ${level + 1}`);

      // Move to the next parent (i.e., the parent of the current parentUser)
      currentUser = parentUser;
      parentUser = await User.findOne({ referralCode: currentUser.referredBy });

      // Stop if no parent user is found
      if (!parentUser) {
        console.log(`No parent user found at level ${level + 1}. Stopping profit distribution.`);
        break;
      }

      level++;
    }

    res.status(200).json({
      message: "Package purchased successfully",
      package: packageData,
    });
  } catch (error) {
    console.log("error=>", error);
    res.status(500).json({ error: error.message });
  }
};







const countActiveUsersInSubtree = async (userId, count = 0) => {
  const user = await User.findById(userId).populate('leftChild').populate('rightChild');
  if (!user) return count;

  // Increment count if the user is active
  if (user.active) count++;

  // Recursively check the left and right children
  if (user.leftChild) {
    count = await countActiveUsersInSubtree(user.leftChild._id, count);
  }

  if (user.rightChild) {
    count = await countActiveUsersInSubtree(user.rightChild._id, count);
  }

  return count;
};





const calculateMatchingIncome = async (parentId) => {
  try {
    const user = await User.findById(parentId);
    if (!user) {
      throw new Error('User not found');
    }

    // if (user.matchingIncome > 300) {
    //   console.log("Matching Income exceeds $300");
    //   return;
    // }

    // Count active users on both the left and right sides of the tree
    const leftActiveCount = await countActiveUsersInSubtree(user.leftChild);
    const rightActiveCount = await countActiveUsersInSubtree(user.rightChild);

    console.log("Left active count:", leftActiveCount);
    console.log("Right active count:", rightActiveCount);

    // Check for matching pairs (2:1 or 1:2)
    let isMatchingPair = false;
    if (!user.hasReceivedFirstMatchingIncome) {
      isMatchingPair = (leftActiveCount >= 2 && rightActiveCount >= 1) ||
        (leftActiveCount >= 1 && rightActiveCount >= 2);
      
      if (isMatchingPair) {
        user.hasReceivedFirstMatchingIncome = true;
      }
    } else {
      isMatchingPair = (leftActiveCount === rightActiveCount);
      if (isMatchingPair) {
        // Update rank salary activation based on active counts (as per your logic)
        updateRankSalary(user, leftActiveCount);
      }
    }

    if (isMatchingPair) {
      // Update the user's matching income
      const matchingIncomeAmount = 100;  // Example: $5 for each matching pair
      user.earningWallet += matchingIncomeAmount;
      user.matchingIncome += matchingIncomeAmount;
      user.hasReceivedFirstMatchingIncome = false;
      await user.save();

      // Store the matching income in the MatchingIncome collection
      const matchingIncomeRecord = new MatchingIncome({
        user: user._id,
        referralCode: user.referralCode,
        amount: matchingIncomeAmount,
      });

      await matchingIncomeRecord.save(); // Save the record to the database

      console.log(`Matching income updated for user: ${user.email}, new income: $${user.matchingIncome}`);
    } else {
      console.log('No matching pair found.');
    }

    return user;
  } catch (error) {
    console.error(error);
    throw new Error('Error in calculating matching income');
  }
};







// exports.buyPackage = async (req, res) => {
//   console.log("req.bosy===>",req.body)
//   try {
//     const pack1 = {
//       package_Id: "SMART001",
//       name: "Smart Package",
//       price: "699",
//       des: "E-Book",
//       direct_ref_comission: "200",
//       b_capping: "700",
//       img: "/images/ebook.png",
//     };

//     const pack2 = {
//       package_Id: "PRIME002",
//       name: "Prime Package",
//       price: "1299",
//       des: "E-Book Bundle",
//       direct_ref_comission: "500",
//       b_capping: "1300",
//       img: "/images/ebook_bundle.png",
//     };
//     const { packageId, userId } = req.body;
//     console.log("body ==>", req.body);

//     // Find the package by ID
//     if (!packageId) {
//       return res.status(404).json({ error: "Package not found" });
//     }

//     let packageData;

//     if (packageId === "SMART001") {
//       packageData = pack1;
//     } else if (packageId === "PRIME002") {
//       packageData = pack2;
//     } else {
//       return res.status(404).json({ error: "Package not found" });
//     }

//     // Find the user who is purchasing the package
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // Check if the user has enough balance in recharge wallet
//     if (user.rechargeWallet < packageData.price) {
//       return res
//         .status(400)
//         .json({ error: "Insufficient balance in recharge wallet." });
//     }

//     // Deduct the package price from user's recharge wallet
//     user.rechargeWallet -= packageData.price;

//     // Update user data
//     user.active = true;
//     user.packages.push(packageData.package_Id); // Add package to user's purchased packages
//     user.purchaseDate.push(Date.now());
//     user.business += packageData.price;

//     // Save the updated user
//     await user.save();
//     console.log("user updated", user);

//     // Save activation transaction
//     const activation = new ActivationTransaction({
//       user: user.referralCode,
//       email: user.email,
//       mobileNumber: user.mobileNumber,
//       activateBy: "user",
//       package: packageData.name,
//       packagePrice: packageData.price,
//       wallet: user.rechargeWallet,
//     });
//     await activation.save();

//     console.log(packageData);
//     const parentUser = await User.findOne({referralCode:user.referredBy});
//     if (!parentUser) {
//       return res.status(404).json({ error: "Parent User not found" });
//     }

//     parentUser.earningWallet += packageData.direct_ref_comission;
//     await parentUser.save();
//     // await this.calculateDailyProfits(user._id,packageData._id);
//     // await updateUplineBuisness(userId, packageId);
//     // await checkBusiness();
//     res.status(200).json({
//       message: "Package purchased successfully",
//       package: packageData,
//     });
//   } catch (error) {
//     console.log("error=>", error);
//     res.status(500).json({ error: error.message });
//   }
// };

exports.myProjects = async (req, res) => {
  try {
    // console.log("req.params=>", req.params);

    const result = await User.find({ _id: req.params.id });
    // console.log("result users projects=>", result);

    const products = await Promise.all(
      result.map(async (user) => {
        return await Promise.all(
          user.packages.map(async (item) => {
            return await Product.findOne({ _id: item });
          })
        );
      })
    ).then((productArrays) => productArrays.flat());

    // console.log("products=>", products);

    res.status(200).send({ users: result, products });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAccountDetails = async (req, res) => {
  try {
    const result = await User.findOne({ _id: req.params.userId });
    console.log("reult", result);

    const { accountNumber, ifscCode, userName, wallet } = result;
    res.status(200).send({ accountNumber, ifscCode, userName, wallet });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateAccountDetails = async (req, res) => {
  try {
    const { accountNumber, ifscCode, userName } = req.body;

    if (!accountNumber || !ifscCode || !userName) {
      return res.status(400).json({ error: "All fields are required" });
    }

    console.log("datfatat=>");

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { accountNumber, ifscCode, userName },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res
      .status(200)
      .json({ message: "Account details updated successfully", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSelfBonusList = async (req, res) => {
  // console.log(req.params.id);

  try {
    const result = await selfBonus.find({ user: req.params.id });
    // console.log("result",result);

    res.status(200).send(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllSelfBonusList = async (req, res) => {
  // console.log(req.params.id);

  try {
    const result = await selfBonus.find();
    // console.log("result",result);

    res.status(200).send(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getDailyIncomeList = async (req, res) => {
  console.log(req.params.id);

  try {
    const result = await DailyIncomeTransaction.find({ user: req.params.id });
    // console.log("result",result);

    res.status(200).send(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.uptimeRobot = async () => {
  try {
    res.status(200).send("Hello Hype");
  } catch (error) {
    res.status(400).json({ error: err.message });
  }
};

exports.getGameIncomeList = async (req, res) => {
  console.log(req.params.id);

  try {
    const result = await GameIncomeTransaction.find({ userId: req.params.id });
    console.log("result", result);

    res.status(200).send(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deductWalletOnGame = async (req, res) => {
  try {
    const { userId, amount, game, type } = req.body;
    const user = await User.findById(userId);
    if (user.wallet <= 0) {
      return;
    }
    user.wallet -= amount;
    // user.earningWallet -= amount;
    await user.save();

    const newPrize = new GameIncomeTransaction({
      userId,
      prize: amount,
      game,
      type,
    });

    await newPrize.save();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addGamePrize = async (req, res) => {
  try {
    const { prize, userId, game, type } = req.body;
    const user = await User.findById(userId);

    if (prize > 0) {
      const newPrize = new GameIncomeTransaction({
        userId,
        prize,
        game,
        type,
      });
      await newPrize.save();
      user.wallet += prize;
    }

    user.spinCount -= 1;
    user.earningWallet += prize;
    user.totalEarning += prize;
    user.todayEarning += prize;
    await user.save();

    res.status(200).json({ prize, message: "Prize added to wallet" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLevelIncomeList = async (req, res) => {
  console.log(req.params.id);

  try {
    const result = await LevelIncomeTransaction.find({ user: req.params.id });
    console.log("result", result);

    res.status(200).send(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getReferralsIncomeList = async (req, res) => {
  console.log(req.params.id);

  try {
    const result = await ReferralIncomeTransaction.find({
      user: req.params.id,
    });
    console.log("result", result);

    res.status(200).send(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getWithdrawPaymentRequest = async (req, res) => {
  console.log("withdraw transaction called");

  const userId = req.params.id;
  try {
    const result = await WithdrawPaymentRequest.find({ userId });
    res.json(result);
  } catch (err) {
    console.log("Error while getting withdraw transactions:", err);
    res.status(500).send("Server Error");
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const result = await Payments.find({ userId: req.params.id });
    console.log("reult", result);

    res.status(200).send(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id); // Use req.params.id to get the user ID
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
    console.log("error");
  }
};

// Get Referral History

exports.getReferralHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const referredUsers = await User.find({ referredBy: user.referralCode });

    res.status(200).json(referredUsers);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};



const updateUplineBuisness = async (userId, packageId) => {
  try {
    const userData = await User.findById(userId);
    const productDetails = await Product.findById(packageId);
    const upline = await User.findOne({ referralCode: userData.referredBy });

    if (upline && upline.active) {
      upline.business += productDetails.price;

      await upline.save();

      await updateUplineBuisness(upline, packageId);
    }
  } catch (error) {
    console.log("error=>", error);
    res.status(500).json({ error: error.message });
  }
};

const checkBusiness = async () => {
  try {
    const users = await User.find({ active: true });
    console.log("usersssssss =====>", users.length);

    // const userId = "66f64b96cde078a8222e36a6";
    for (const user of users) {
      // const user = await User.findById(userId)
      const downlineUsers =
        (await User.find({ referredBy: user.referralCode })) || [];
      // console.log("downline ===>", downlineUsers);

      let businessArray = [];
      let powerLeg = 0;
      let singleLeg = 0;

      for (let i = 0; i < downlineUsers.length; i++) {
        businessArray.push(downlineUsers[i].business);
      }
      console.log("business array ===>", businessArray);

      // Ensure businessArray contains valid numbers
      if (businessArray.length === 0) {
        console.log("No valid business entries found.");
        continue;
        // return;
      }

      let totalSum = businessArray.reduce((acc, num) => acc + num, 0);
      let max = Math.max(...businessArray);

      // Check if any value is greater than the sum of the other values
      for (let num of businessArray) {
        let sumOfRemaining = totalSum - num;

        if (num > sumOfRemaining) {
          powerLeg = num;
          break; // Return the first number that satisfies the condition
        }
      }

      // If no number satisfies the condition, take the largest number as powerLeg
      if (powerLeg === 0) {
        powerLeg = max;
      }

      // Calculate the single leg as the remaining sum
      singleLeg = totalSum - powerLeg;

      console.log("power ====>", powerLeg);
      console.log("other ====>", singleLeg);

      await checkSalary(user._id, powerLeg, singleLeg);
    }
  } catch (error) {
    console.log(error);
  }
};

// cron.schedule('* * * * *', checkBusiness);

const checkSalary = async (userId, powerLeg, singleLeg) => {
  console.log("salary userId =====> ", userId);
  console.log("salary powerLeg =====> ", powerLeg);
  console.log("salary singleLeg =====> ", singleLeg);

  try {
    const userDetail = await User.findById(userId);

    // Initialize arrays if they are undefined or empty
    userDetail.weeklySalaryActivation =
      userDetail.weeklySalaryActivation || Array(12).fill(false);
    userDetail.powerLeg = userDetail.powerLeg || Array(12).fill(0);
    userDetail.otherLeg = userDetail.otherLeg || Array(12).fill(0);
    userDetail.weeklySalaryStartDate =
      userDetail.weeklySalaryStartDate || Array(12).fill(null);

    const salaryTiers = [
      { index: 0, amount: 25000 },
      { index: 1, amount: 75000 },
      { index: 2, amount: 150000 },
      { index: 3, amount: 250000 },
      { index: 4, amount: 500000 },
      { index: 5, amount: 1000000 },
      { index: 6, amount: 1750000 },
      { index: 7, amount: 2750000 },
      { index: 8, amount: 5250000 },
      { index: 9, amount: 10250000 },
      { index: 10, amount: 17750000 },
      { index: 11, amount: 27750000 },
    ];

    // If both legs are less than 25,000, just add them and return
    if (powerLeg < 12500 || singleLeg < 12500) {
      userDetail.powerLeg[0] = powerLeg;
      userDetail.otherLeg[0] = singleLeg;
      console.log(
        "Added to power and single leg values without salary activation."
      );
      await userDetail.save();
      return;
    }

    // Loop through salary tiers and check conditions
    for (const { index, amount } of salaryTiers) {
      const halfAmount = amount / 2;
      console.log("helo ===>", amount);

      // Check if both powerLeg and singleLeg are greater than or equal to half of the required amount for this tier
      if (powerLeg >= halfAmount && singleLeg >= halfAmount) {
        console.log("added ====>", amount);

        if (!userDetail.weeklySalaryActivation[index]) {
          // Salary activation for this tier
          userDetail.weeklySalaryActivation[index] = true;
          userDetail.powerLeg[index] = halfAmount;
          userDetail.otherLeg[index] = halfAmount;
          userDetail.weeklySalaryStartDate[index] = Date.now();

          // Calculate excess (remaining) values
          const remainingPowerLeg = powerLeg - halfAmount;
          const remainingSingleLeg = singleLeg - halfAmount;
          console.log("remainigPowerLeg ==>", remainingPowerLeg);
          console.log("remainingSingleLeg ==>", remainingSingleLeg);

          // Add remaining values to the next available leg
          if (index + 1 < salaryTiers.length) {
            userDetail.powerLeg[index + 1] = remainingPowerLeg;
            userDetail.otherLeg[index + 1] = remainingSingleLeg;
          }

          console.log(`Salary at tier ${index} started for amount ${amount}`);
          await userDetail.save();

          // Update powerLeg and singleLeg for further iterations
          powerLeg = remainingPowerLeg;
          singleLeg = remainingSingleLeg;
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
};

// Get User Activity
exports.getUserActivity = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const referredUsers = await User.find({ referredBy: user.referralCode });

    const activeUsers = referredUsers.filter((user) => user.active);
    const unrechargedUsers = referredUsers.filter((user) => !user.active);

    res.status(200).json({ activeUsers, unrechargedUsers });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.claimDailyIncome = async (req, res) => {
  try {
    const { userId, amount, packageId } = req.body;
    const user = await User.findById(userId);
    const packageData = await Product.findById(packageId);
    // console.log('userClaim ==>',user);
    // console.log('packageClaim ==>',packageData);

    user.temporaryWallet -= packageData.income;
    // console.log('temp ==>',user.temporaryWallet);

    user.wallet += packageData.income;
    user.totalEarning += packageData.income;
    user.todayEarning += packageData.income;
    // console.log('wallet ==>',user.wallet);

    for (let i = 0; i < user.packages.length; i++) {
      const package = await Product.findById(user.packages[i]);
      if (user.packages[i]._id == packageId) {
        console.log("check status");

        user.claimBonus[i] = true;
        user.myRoi[i] += Number(package.income);
      }
    }
    await user.save();
    console.log("Updated user ==>", user);

    const dailyIncome = new DailyIncomeTransaction({
      user: user._id,
      amount: packageData.income,

      package: packageData.name,
    });
    await dailyIncome.save();

    res
      .status(200)
      .json({ user, message: "Income is successfully added to your wallet" });
  } catch (error) {
    console.log("error ==>", error);
  }
};

// Calculate Daily Profits
exports.calculateDailyProfits = async (userId, packageId) => {
  try {
    // Fetch the specific user by userId
    const user = await User.findById(userId);
    if (!user) {
      console.log("User not found");
      return;
    }

    // Get current day of the week
    const currentDay = new Date().getDay();

    // Skip calculation on Saturday (6) and Sunday (0)
    if (currentDay === 0 || currentDay === 6) {
      console.log("No profits calculated on weekends.");
      return;
    }

    user.temporaryWallet = 0;
    user.todayEarning = 0;
    user.yesterdayWallet = user.wallet;
    user.withdrawlCount = 0;

    // Find the specific package by packageId
    const packageIndex = user.packages.findIndex(
      (pkg) => pkg.toString() === packageId.toString()
    );

    if (packageIndex === -1) {
      console.log("Package not found for this user");
      return;
    }

    let dailyProfit = 0;
    const purchaseDate = user.purchaseDate[packageIndex]; // Get the corresponding purchase date

    // Fetch the product details for the packageId
    const product = await Product.findById(packageId);
    if (product) {
      const daysSincePurchase = Math.floor(
        (Date.now() - new Date(purchaseDate)) / (1000 * 60 * 60 * 24)
      );

      // Check if the package is within the product's cycle
      if (daysSincePurchase <= product.cycle) {
        dailyProfit += Number(product.income);
      }
    }

    user.temporaryWallet += dailyProfit;

    // Only set claimBonus if today is not Saturday or Sunday
    // if (currentDay !== 0 && currentDay !== 6) {
    //   user.claimBonus[packageIndex] = true;
    // }

    await user.save();

    if (dailyProfit > 0) {
      // Distribute profit to upline users
      await distributeProfitToUplines(user, user, product, dailyProfit, 1); // Pass the original user and the first upline user
    }

    console.log("Daily profit calculated and distributed for user:", userId);
  } catch (err) {
    console.error("Error calculating daily profits:", err);
  }
};

// Function to distribute profit to upline users
const distributeProfitToUplines = async (
  originalUser,
  uplineUser,
  product,
  dailyProfit,
  level
) => {
  // Get current day of the week
  const currentDay = new Date().getDay();

  // Skip transaction creation on Saturday (6) and Sunday (0)
  if (currentDay === 0 || currentDay === 6) {
    console.log(`Skipping level income transaction for weekends.`);
    return;
  }

  if (!uplineUser.referredBy || level > 5) return; // Stop if no upline or beyond 5 levels

  const nextUplineUser = await User.findOne({
    referralCode: uplineUser.referredBy,
  });

  if (nextUplineUser) {
    // Define profit percentages for each level
    const profitPercentages = {
      1: 0.1, // 10% for direct referrals
      2: 0.05, // 5% for second-level referrals
      3: 0.03, // 3% for third-level referrals
    };

    const profitPercentage = profitPercentages[level] || 0;
    const uplineProfit = product.price * profitPercentage;

    // Update upline user's wallet
    nextUplineUser.wallet += uplineProfit;
    nextUplineUser.teamIncome += uplineProfit;
    nextUplineUser.earningWallet += uplineProfit;
    nextUplineUser.totalEarning += uplineProfit;
    nextUplineUser.todayEarning += uplineProfit;
    await nextUplineUser.save();

    // Record the transaction only on weekdays
    const levelTransaction = new LevelIncomeTransaction({
      user: nextUplineUser._id,
      netIncome: uplineProfit,
      fromUser: originalUser.referralCode, // Use the original user for fromUser
      amount: product.price,
      level,
      package: product.name,
    });
    await levelTransaction.save();

    // Recursively distribute profit to the next level
    await distributeProfitToUplines(
      originalUser,
      nextUplineUser,
      product,
      dailyProfit,
      level + 1
    );
  }
};

exports.updateDailySalaryForAllActiveUsers = async (req, res) => {
  try {
    // Fetch all active users
    const activeUsers = await User.find({ active: true });

    if (!activeUsers.length) {
      return res.status(400).json({ message: "No active users found" });
    }

    let totalWalletUpdate = 0;
    let updatedUsersCount = 0;
    const currentDate = new Date();

    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 6 || dayOfWeek === 5) {
      return res
        .status(400)
        .json({
          message:
            "Salary distribution is not allowed on Saturdays and Sundays.",
        });
    }

    // Iterate over each active user
    for (let user of activeUsers) {
      let walletUpdate = 0;
      let shouldUpdate = false;
      for (let j = 0; j < user.packages.length; j++) {
        user.claimBonus[j] = false;
        console.log("bonus Claimed");
        await user.save();
      }

      // Iterate over weeklySalaryActivation array
      for (let i = 0; i < user.weeklySalaryActivation.length; i++) {
        if (user.weeklySalaryActivation[i]) {
          const startDate = new Date(user.weeklySalaryStartDate[i]);
          const salaryPrice = user.weeklySalaryPrice[i];

          // Calculate the number of days since the startDate
          let daysSinceStart = Math.floor(
            (currentDate - startDate) / (1000 * 60 * 60 * 24)
          );

          // Check if the user is within the 25-day window and not on a weekend (Saturday or Sunday)
          if (daysSinceStart < 25) {
            // Calculate the last salary claimed date
            let lastSalaryClaimedDate = new Date(
              startDate.getTime() + daysSinceStart * 24 * 60 * 60 * 1000
            );

            // Check if the salary is due (i.e., it's the right time for a new payment)
            if (
              currentDate >= lastSalaryClaimedDate &&
              currentDate - lastSalaryClaimedDate >= 24 * 60 * 60 * 1000
            ) {
              walletUpdate += salaryPrice;
              shouldUpdate = true;
            }
          } else {
            // If 25 days are completed, set weeklySalaryActivation[i] to false
            user.weeklySalaryActivation[i] = false;
          }
        }
      }

      // Update the user's wallet and save if required
      if (shouldUpdate || walletUpdate > 0) {
        user.wallet += walletUpdate;
        await user.save(); // Save the updated user details
        totalWalletUpdate += walletUpdate;
        updatedUsersCount++;
      }
    }

    // Send response indicating the number of users whose wallet was updated
    res.status(200).json({
      message: `${updatedUsersCount} users' wallets updated successfully`,
      totalWalletUpdate,
    });
  } catch (error) {
    console.error("Error updating daily salary for active users:", error);
    res.status(500).json({ message: "Server error" });
  }
};
