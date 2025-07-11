"use client"

import { Link } from "react-router-dom"
import { useCart } from "../context/CartContext"
import { ShoppingCart, Heart } from "lucide-react"
import { useWishlist } from "../context/WishlistContext"
import { useToast } from "../context/ToastContext"

const ProductCard = ({ product }) => {
  const { addToCart } = useCart()
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()
  const { showToast } = useToast()

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(product)
    showToast && showToast("Added to cart", "success")
  }

  const formatPrice = (price) => {
    return `AED ${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }

  // Use slug if available, otherwise fall back to ID
  const productUrl = `/product/${product.slug || product._id}`

  // Determine which price to show
  const hasDiscount = product.discount && Number(product.discount) > 0
  const hasOffer = product.offerPrice && Number(product.offerPrice) > 0
  const showOldPrice = hasOffer && Number(product.basePrice) > Number(product.offerPrice)
  const priceToShow = hasOffer ? product.offerPrice : product.basePrice || product.price
  const stockStatus = product.stockStatus || (product.countInStock > 0 ? 'Available' : 'Out of Stock')

  return (
    <div className="card group">
      <Link to={productUrl} className="block">
        <div className="relative overflow-hidden">
          <img
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Discount badge */}
          {hasDiscount && (
            <span className="absolute top-2 left-2 bg-yellow-400 text-white px-2 py-1 rounded text-xs font-bold">
              {Number(product.discount)}% Off
            </span>
          )}
          {/* Stock status badge */}
          <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${stockStatus === 'Available' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {stockStatus}
          </span>
          <button
            className="absolute top-2 right-10 z-10 bg-white rounded-full p-2 shadow hover:bg-red-50"
            onClick={e => {
              e.preventDefault(); e.stopPropagation();
              if (isInWishlist(product._id)) {
                removeFromWishlist(product._id);
                showToast && showToast("Removed from wishlist", "info");
              } else {
                addToWishlist(product);
                showToast && showToast("Added to wishlist", "success");
              }
            }}
            aria-label={isInWishlist(product._id) ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart size={20} className={isInWishlist(product._id) ? "text-red-500 fill-red-500" : "text-gray-400"} />
          </button>
          <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex items-center justify-center">
            <button
              onClick={handleAddToCart}
              className="bg-white text-gray-900 py-2 px-4 rounded-full font-medium flex items-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300"
            >
              <ShoppingCart size={18} className="mr-2" />
              Add to Cart
            </button>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-medium text-gray-900 mb-1 truncate">{product.name}</h3>
          <p className="text-gray-500 text-sm mb-2">{product.brand?.name || product.brand || 'N/A'}</p>
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-bold text-red-600 text-lg">{formatPrice(priceToShow)}</span>
            {showOldPrice && (
              <span className="text-gray-500 line-through text-sm">{formatPrice(product.basePrice)}</span>
            )}
          </div>
          <div className="text-xs text-gray-500 mb-1">Inclusive VAT</div>
        </div>
      </Link>
    </div>
  )
}

export default ProductCard
