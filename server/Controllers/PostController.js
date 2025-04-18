import PostModel from "../Models/postModel.js";
import mongoose from "mongoose";
import UserModel from "../Models/userModel.js";
import {createChat}  from "./chatController.js";
import errResponse from "../utils/errApiResponse.js";
import apiResponse from "../utils/responseModel.js";

// Create new Post
export const createPost = async (req, res) => {
  const {post, userId} = req.body;
  console.log(post.desc)

  if (!post, !userId) {
    return res.json(new errResponse(
      400,
      null,
      "user or post content missing"
    ))
  }

  const  newPost = await new PostModel({
    userId,
    desc: post.desc,
  })

  try {
    const savedPost = await newPost.save();

    const user = await UserModel.findById(userId).populate({
      path: "post",
      populate: {
        path: "userId",
        model: "Posts", 
      },
    });

    console.log(user)

  if (!user) {
    return res.json(new errResponse(
      400,
      null,
      "User not found"
    ))
  }
  console.log("-------------------------")
  console.log(user.post.length)
  console.log("-------------------------")
  if (user.post.length >= 3) {
    return res.json(new errResponse(
      400,
      null,
      "User cannot have more than 3 posts"
    ))
  }

  if (!user.post.includes(savedPost._id)) {
    user.post.push(savedPost._id);
    await user.save();
  }

    console.log(userId)
    const chat = await createChat(userId, savedPost._id)
    
    return res.status(200).json({
      message: "Post and associated chat created successfully",
      post: savedPost,
      chat
  });
  } catch (error) {
    console.log(error)
    return res.json(new errResponse(
      500,
      null,
      "cannot create post"
    ))
  }
};

// Get a post

export const getPost = async (req, res) => {
  const id = req.params.id;

  try {
    const post = await PostModel.findById(id);
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json(error);
  }
};

// Update a post
export const updatePost = async (req, res) => {
  const postId = req.params.id;
  const { userId } = req.body;

  try {
    const post = await PostModel.findById(postId);
    if (post.userId === userId) {
      await post.updateOne({ $set: req.body });
      res.status(200).json("Post Updated");
    } else {
      res.status(403).json("Action forbidden");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  const id = req.params.id;
  const { userId } = req.body;

  try {
    const post = await PostModel.findById(id);
    if (post.userId === userId) {
      await post.deleteOne();
      user.post.remove(post._id)
      await user.save()
      res.status(200).json("POst deleted successfully");
    } else {
      res.status(403).json("Action forbidden");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// like/dislike a post
export const likePost = async (req, res) => {
  const id = req.params.id;
  const { userId } = req.body;

  try {
    const post = await PostModel.findById(id);
    if (!post.likes.includes(userId)) {
      await post.updateOne({ $push: { likes: userId } });
      res.status(200).json("Post liked");
    } else {
      await post.updateOne({ $pull: { likes: userId } });
      res.status(200).json("Post Unliked");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// Get Timeline POsts
export const getTimelinePosts = async (req, res) => {
  const userId = req.params.id;

  try {
    const currentUserPosts = await PostModel.find({ userId: userId });
    const followingPosts = await UserModel.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "posts",
          localField: "following",
          foreignField: "userId",
          as: "followingPosts",
        },
      },
      {
        $project: {
          followingPosts: 1,
          _id: 0,
        },
      },
    ]);

    res
      .status(200)
      .json(currentUserPosts.concat(...followingPosts[0].followingPosts)
      .sort((a,b)=>{
          return b.createdAt - a.createdAt;
      })
      );
  } catch (error) {
    res.status(500).json(error);
  }
};