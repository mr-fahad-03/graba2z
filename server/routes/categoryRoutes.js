import express from "express"
import asyncHandler from "express-async-handler"
import Category from "../models/categoryModel.js"
import { protect, admin } from "../middleware/authMiddleware.js"

const router = express.Router()

// @desc    Fetch all categories (Admin only - includes inactive)
// @route   GET /api/categories/admin
// @access  Private/Admin
router.get(
  "/admin",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const categories = await Category.find({ isDeleted: { $ne: true } }).sort({ sortOrder: 1, name: 1 })
    res.json(categories)
  }),
)

// @desc    Fetch all categories
// @route   GET /api/categories
// @access  Public
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await Category.find({ isActive: true, isDeleted: { $ne: true } }).sort({ sortOrder: 1, name: 1 })
    res.json(categories)
  }),
)

// @desc    Get all trashed (soft-deleted) categories
// @route   GET /api/categories/trash
// @access  Private/Admin
router.get(
  "/trash",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const trashedCategories = await Category.find({ isDeleted: true }).sort({ deletedAt: -1 })
    res.json(trashedCategories)
  })
)

// @desc    Fetch single category
// @route   GET /api/categories/:id
// @access  Public
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id)

    if (category && category.isActive !== false) {
      res.json(category)
    } else {
      res.status(404)
      throw new Error("Category not found")
    }
  }),
)

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
router.post(
  "/",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const { name, description, image, slug } = req.body

    if (!name || name.trim() === "") {
      res.status(400)
      throw new Error("Category name is required")
    }

    // Check if category with same name already exists
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    })

    if (existingCategory) {
      res.status(400)
      throw new Error("Category with this name already exists")
    }

    // Generate slug if not provided
    const categorySlug = slug || name.trim().toLowerCase().replace(/\s+/g, "-")

    const category = new Category({
      name: name.trim(),
      description: description || "",
      image: image || "",
      slug: categorySlug,
      isActive: true,
      createdBy: req.user._id,
    })

    const createdCategory = await category.save()
    res.status(201).json(createdCategory)
  }),
)

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
router.put(
  "/:id",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const { name, description, image, slug, isActive } = req.body

    const category = await Category.findById(req.params.id)

    if (category) {
      // Check if another category with same name exists (excluding current)
      if (name && name.trim() !== category.name) {
        const existingCategory = await Category.findOne({
          name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
          _id: { $ne: req.params.id },
        })

        if (existingCategory) {
          res.status(400)
          throw new Error("Category with this name already exists")
        }
      }

      category.name = name?.trim() || category.name
      category.description = description !== undefined ? description : category.description
      category.image = image !== undefined ? image : category.image
      category.slug = slug || category.slug
      category.isActive = isActive !== undefined ? isActive : category.isActive

      const updatedCategory = await category.save()
      res.json(updatedCategory)
    } else {
      res.status(404)
      throw new Error("Category not found")
    }
  }),
)

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
router.delete(
  "/:id",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id)

    if (category) {
      // Soft delete - mark as deleted instead of removing
      category.isDeleted = true
      category.isActive = false
      await category.save()

      res.json({ message: "Category deleted successfully" })
    } else {
      res.status(404)
      throw new Error("Category not found")
    }
  }),
)

// @desc    Get categories with product count
// @route   GET /api/categories/with-count
// @access  Public
router.get(
  "/with-count",
  asyncHandler(async (req, res) => {
    const categories = await Category.aggregate([
      {
        $match: {
          isActive: { $ne: false },
          isDeleted: { $ne: true },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "category",
          as: "products",
        },
      },
      {
        $addFields: {
          productCount: { $size: "$products" },
        },
      },
      {
        $project: {
          products: 0,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ])

    res.json(categories)
  }),
)

export default router
