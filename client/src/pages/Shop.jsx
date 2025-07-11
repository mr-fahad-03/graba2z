"use client"

import { useState, useEffect } from "react"
import { Search, ChevronDown, Minus } from "lucide-react"
import axios from "axios"
import { useNavigate, useLocation } from "react-router-dom"
import { useCart } from "../context/CartContext"
import HomeStyleProductCard from "../components/HomeStyleProductCard"

import config from "../config/config"
import 'rc-slider/assets/index.css';
import Slider from 'rc-slider';

const API_BASE_URL = `${config.API_URL}`

// Define the exact parent categories to show in filters
const PARENT_CATEGORIES = [
  "All In One",
  "Desktop",
  "Monitors",
  "Mobiles",
  "Laptops",
  "Printers & Copier",
  "Routers",
  "Projector",
  "Accessories",
  "Networking",
]

const bounceStyle = {
  animation: "bounce 1s infinite",
}
const bounceKeyframes = `
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-30px); }
}`
if (typeof document !== "undefined" && !document.getElementById("bounce-keyframes")) {
  const style = document.createElement("style")
  style.id = "bounce-keyframes"
  style.innerHTML = bounceKeyframes
  document.head.appendChild(style)
}

const PriceFilter = ({ min, max, onApply, initialRange }) => {
  const [range, setRange] = useState(initialRange || [min, max]);
  const [inputMin, setInputMin] = useState(range[0]);
  const [inputMax, setInputMax] = useState(range[1]);

  const handleSliderChange = (values) => {
    setRange(values);
    setInputMin(values[0]);
    setInputMax(values[1]);
  };

  const handleInputMin = (e) => {
    const value = Number(e.target.value);
    setInputMin(value);
    setRange([value, range[1]]);
  };

  const handleInputMax = (e) => {
    const value = Number(e.target.value);
    setInputMax(value);
    setRange([range[0], value]);
  };

  const handleApply = () => {
    onApply([inputMin, inputMax]);
  };

  return (
    <div className="">
    
      <Slider
        range
        min={min}
        max={max}
        value={range}
        onChange={handleSliderChange}
        trackStyle={[{ backgroundColor: '#84cc16' }]} // lime-500
        handleStyle={[
          { backgroundColor: '#84cc16', borderColor: '#84cc16' },
          { backgroundColor: '#84cc16', borderColor: '#84cc16' },
        ]}
        railStyle={{ backgroundColor: '#e5e7eb' }}
      />
      <div className="flex justify-between mt-4 mb-2 text-xs font-semibold">
        <span>MIN</span>
        <span>MAX</span>
      </div>
      <div className="flex gap-2 mb-4">
        <input
          type="number"
          className="w-1/2 border rounded px-2 py-1 text-center focus:border-lime-500 focus:ring-lime-500"
          value={inputMin}
          min={min}
          max={inputMax}
          onChange={handleInputMin}
        />
        <input
          type="number"
          className="w-1/2 border rounded px-2 py-1 text-center focus:border-lime-500 focus:ring-lime-500"
          value={inputMax}
          min={inputMin}
          max={max}
          onChange={handleInputMax}
        />
      </div>
      <button
        className="w-full bg-white border border-lime-500 text-lime-600 rounded py-2 font-semibold hover:bg-lime-50 hover:text-lime-700 hover:border-lime-600 transition"
        onClick={handleApply}
      >
        Apply
      </button>
    </div>
  );
};

const Shop = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { addToCart } = useCart()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedBrands, setSelectedBrands] = useState([])
  const [priceRange, setPriceRange] = useState([0, 10000])
  const [maxPrice, setMaxPrice] = useState(10000)
  const [sortBy, setSortBy] = useState("newest")
  const [brandSearch, setBrandSearch] = useState("")
  const [subCategories, setSubCategories] = useState([])
  const [selectedSubCategories, setSelectedSubCategories] = useState([])
  const [stockFilters, setStockFilters] = useState({ inStock: false, outOfStock: false, onSale: false })

  // Filter panel states
  const [showPriceFilter, setShowPriceFilter] = useState(true)
  const [showCategoryFilter, setShowCategoryFilter] = useState(true)
  const [showBrandFilter, setShowBrandFilter] = useState(true)

  const [productsToShow, setProductsToShow] = useState(20)

  // Fetch categories and brands on mount
  useEffect(() => {
    fetchCategories()
    fetchBrands()
    fetchBanners()
    fetchProducts()
  }, [])

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts()
  }, [selectedCategory, selectedBrands, searchQuery, priceRange, selectedSubCategories, stockFilters])

  // Fetch subcategories when selectedCategory changes
  useEffect(() => {
    if (selectedCategory && selectedCategory !== "all") {
      fetchSubCategories()
    } else {
      setSubCategories([])
      setSelectedSubCategories([])
    }
  }, [selectedCategory, categories])

  // Sync selectedCategory and filters with URL
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const categoryParam = params.get("category")
    const brandParam = params.get("brand")
    const searchParam = params.get("search")

    if (categoryParam) {
      setSelectedCategory(categoryParam)
      setSelectedSubCategories([])
      setSelectedBrands([])
    } else {
      setSelectedCategory("all")
      setSelectedSubCategories([])
      setSelectedBrands([])
    }

    if (brandParam) {
      // Find brand by name and set it
      brands.forEach((brand) => {
        if (brand.name.toLowerCase() === brandParam.toLowerCase()) {
          setSelectedBrands([brand._id])
        }
      })
    }

    if (searchParam) {
      setSearchQuery(searchParam)
    }
  }, [location.search, brands])

  // Reset productsToShow when filters change or products are refetched
  useEffect(() => {
    setProductsToShow(20)
  }, [selectedCategory, selectedBrands, searchQuery, priceRange, selectedSubCategories, stockFilters, products.length])

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/categories`)
      console.log("Categories fetched:", data)

      // Filter to only show parent categories
      const validCategories = data.filter((cat) => {
        const isValid =
          cat &&
          typeof cat === "object" &&
          cat.name &&
          typeof cat.name === "string" &&
          cat.name.trim() !== "" &&
          cat.isActive !== false &&
          !cat.isDeleted &&
          !cat.name.match(/^[0-9a-fA-F]{24}$/) && // Not an ID
          PARENT_CATEGORIES.includes(cat.name) // Only include predefined parent categories

        return isValid
      })

      console.log("Filtered categories:", validCategories)
      setCategories(validCategories)
    } catch (err) {
      console.error("Error fetching categories:", err)
    }
  }

  const fetchBrands = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/brands`)
      console.log("Brands fetched:", data)

      // Filter and validate brands
      const validBrands = data.filter((brand) => {
        const isValid =
          brand &&
          typeof brand === "object" &&
          brand.name &&
          typeof brand.name === "string" &&
          brand.name.trim() !== "" &&
          brand.isActive !== false &&
          !brand.name.match(/^[0-9a-fA-F]{24}$/) // Not an ID

        return isValid
      })

      console.log("Filtered brands:", validBrands)
      setBrands(validBrands)
    } catch (err) {
      console.error("Error fetching brands:", err)
    }
  }

  const fetchBanners = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/banners`)
      setBanners(data)
    } catch (err) {
      console.error("Error fetching banners:", err)
    }
  }

  const fetchSubCategories = async () => {
    try {
      const catObj = categories.find((cat) => cat.name === selectedCategory)
      if (!catObj) return setSubCategories([])

      const { data } = await axios.get(`${API_BASE_URL}/api/subcategories?category=${catObj._id}`)
      console.log("Subcategories fetched:", data)

      // Filter and validate subcategories
      const validSubCategories = data.filter((sub) => {
        const isValid =
          sub &&
          typeof sub === "object" &&
          sub.name &&
          typeof sub.name === "string" &&
          sub.name.trim() !== "" &&
          !sub.name.match(/^[0-9a-fA-F]{24}$/) // Not an ID

        return isValid
      })

      console.log("Filtered subcategories:", validSubCategories)
      setSubCategories(validSubCategories)
    } catch (err) {
      console.error("Error fetching subcategories:", err)
      setSubCategories([])
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (selectedCategory && selectedCategory !== "all") {
        params.append("category", selectedCategory)
      }
      if (selectedBrands.length > 0) {
        selectedBrands.forEach((brand) => params.append("brand", brand))
      }
      if (searchQuery) {
        params.append("search", searchQuery)
      }
      if (selectedSubCategories.length > 0) {
        selectedSubCategories.forEach((subcat) => params.append("subcategory", subcat))
      }
      if (stockFilters.inStock) params.append("stock", "in")
      if (stockFilters.outOfStock) params.append("stock", "out")
      if (stockFilters.onSale) params.append("onSale", "true")

      console.log("Fetching products with params:", params.toString())
      const { data } = await axios.get(`${API_BASE_URL}/api/products?${params.toString()}`)

      if (data.length > 0) {
        const max = Math.max(...data.map((p) => p.price))
        setMaxPrice(max)
        if (priceRange[1] === 10000) {
          setPriceRange([0, max])
        }
      }

      // Sort products
      const sortedProducts = [...data]
      switch (sortBy) {
        case "price-low":
          sortedProducts.sort((a, b) => (a.price || 0) - (b.price || 0))
          break
        case "price-high":
          sortedProducts.sort((a, b) => (b.price || 0) - (a.price || 0))
          break
        case "name":
          sortedProducts.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          break
        default:
          // newest - already sorted by default
          break
      }

      // Filter by price range
      const filteredProducts = sortedProducts.filter((product) => {
        const price = product.price || 0
        return price >= priceRange[0] && price <= priceRange[1]
      })

      console.log("Products fetched and filtered:", filteredProducts.length)
      setProducts(filteredProducts)
      setLoading(false)
    } catch (err) {
      console.error("Error fetching products:", err)
      setError(err.response?.data?.message || "Error fetching products")
      setLoading(false)
    }
  }

  const filteredBrands = brands.filter((brand) => brand.name.toLowerCase().includes(brandSearch.toLowerCase()))

  const handleCategoryChange = (categoryName) => {
    setSelectedCategory(categoryName)
    setSelectedSubCategories([])
    const params = new URLSearchParams()
    if (categoryName !== "all") {
      params.set("category", categoryName)
    }
    navigate({
      pathname: location.pathname,
      search: params.toString(),
    })
  }

  const handleBrandChange = (brandId) => {
    setSelectedBrands((prev) => (prev.includes(brandId) ? prev.filter((b) => b !== brandId) : [...prev, brandId]))
  }

  const handleSubCategoryChange = (subCatId) => {
    setSelectedSubCategories((prev) =>
      prev.includes(subCatId) ? prev.filter((id) => id !== subCatId) : [...prev, subCatId],
    )
  }

  const handleStockFilterChange = (key) => {
    setStockFilters((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const clearAllFilters = () => {
    setSelectedCategory("all")
    setSelectedBrands([])
    setSelectedSubCategories([])
    setPriceRange([0, maxPrice])
    setSearchQuery("")
    setStockFilters({ inStock: false, outOfStock: false, onSale: false })
    navigate({ pathname: location.pathname, search: "" })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <img src="/g.png" alt="Loading..." style={{ width: 80, height: 80, ...bounceStyle }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p className="text-xl font-semibold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              {/* Search */}
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Price Filter */}
              <div className="border-b pb-4">
                <button
                  onClick={() => setShowPriceFilter(!showPriceFilter)}
                  className="flex items-center justify-between w-full text-left font-medium text-gray-900"
                >
                  Price Range
                  {showPriceFilter ? <Minus size={16} /> : <ChevronDown size={16} />}
                </button>
                {showPriceFilter && (
                  <div className="mt-4 space-y-4">
                    <PriceFilter
                      min={0}
                      max={maxPrice}
                      initialRange={priceRange}
                      onApply={(range) => setPriceRange(range)}
                    />
                  </div>
                )}
              </div>

              {/* Categories Filter */}
              <div className="border-b pb-4">
                <button
                  onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                  className="flex items-center justify-between w-full text-left font-medium text-gray-900"
                >
                  Categories
                  {showCategoryFilter ? <Minus size={16} /> : <ChevronDown size={16} />}
                </button>
                {showCategoryFilter && (
                  <div className="mt-4 space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === "all"}
                        onChange={() => handleCategoryChange("all")}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">All Categories</span>
                    </label>
                    {categories.map((category) => (
                      <label key={category._id} className="flex items-center">
                        <input
                          type="radio"
                          name="category"
                          checked={selectedCategory === category.name}
                          onChange={() => handleCategoryChange(category.name)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 font-medium">{category.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Subcategories Filter */}
              {subCategories.length > 0 && (
                <div className="border-b pb-4">
                  <button className="flex items-center justify-between w-full text-left font-medium text-gray-900">
                    {selectedCategory} Subcategories
                  </button>
                  <div className="mt-4 space-y-2">
                    {subCategories.map((subcat) => (
                      <label key={subcat._id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedSubCategories.includes(subcat._id)}
                          onChange={() => handleSubCategoryChange(subcat._id)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{subcat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Brands Filter */}
              {brands.length > 0 && (
                <div className="border-b pb-4">
                  <button
                    onClick={() => setShowBrandFilter(!showBrandFilter)}
                    className="flex items-center justify-between w-full text-left font-medium text-gray-900"
                  >
                    Brands
                    {showBrandFilter ? <Minus size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {showBrandFilter && (
                    <div className="mt-4 space-y-3">
                      <div className="relative">
                        <Search
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                          size={16}
                        />
                        <input
                          type="text"
                          placeholder="Search brands"
                          value={brandSearch}
                          onChange={(e) => setBrandSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {filteredBrands.map((brand) => (
                          <label key={brand._id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedBrands.includes(brand._id)}
                              onChange={() => handleBrandChange(brand._id)}
                              className="mr-2 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700">{brand.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stock/On Sale Filter */}
              <div className="border-b pb-4">
                <button className="flex items-center justify-between w-full text-left font-medium text-gray-900">
                  Stock
                </button>
                <div className="mt-4 space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={stockFilters.onSale}
                      onChange={() => handleStockFilterChange("onSale")}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">On sale</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={stockFilters.inStock}
                      onChange={() => handleStockFilterChange("inStock")}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">In stock</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={stockFilters.outOfStock}
                      onChange={() => handleStockFilterChange("outOfStock")}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Out of stock</span>
                  </label>
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="pt-4">
                <button
                  onClick={clearAllFilters}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {/* Category Banner - Show when specific category is selected and banner exists */}
            {banners.find((banner) => banner.category === selectedCategory && banner.isActive) && (
              <div className="mb-8">
                <div
                  className="relative rounded-lg overflow-hidden"
                  style={{
                    background:
                      banners.find((banner) => banner.category === selectedCategory && banner.isActive)
                        ?.backgroundColor || "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
                    minHeight: "300px",
                  }}
                >
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 right-20 w-32 h-32 border-2 border-white rounded-full"></div>
                    <div className="absolute top-20 right-40 w-24 h-24 border border-white rounded-full"></div>
                    <div className="absolute bottom-20 right-10 w-40 h-40 border border-white rounded-full"></div>
                  </div>

                  <div className="relative z-10 flex items-center justify-between p-8 h-full">
                    <div className="flex-1 text-white">
                      <h2 className="text-4xl font-bold mb-4">
                        {banners.find((banner) => banner.category === selectedCategory && banner.isActive)?.title ||
                          `Shop ${selectedCategory}`}
                      </h2>
                      <p className="text-xl mb-6 opacity-90">
                        {banners.find((banner) => banner.category === selectedCategory && banner.isActive)
                          ?.description ||
                          `Discover our amazing collection of ${selectedCategory.toLowerCase()} products`}
                      </p>
                      <div className="flex items-center space-x-4">
                        <span className="bg-white text-blue-600 px-4 py-2 rounded-full font-semibold">
                          {products.length} Products Available
                        </span>
                      </div>
                    </div>
                    {banners.find((banner) => banner.category === selectedCategory && banner.isActive)?.image && (
                      <div className="flex-shrink-0 ml-8">
                        <img
                          src={banners.find((banner) => banner.category === selectedCategory && banner.isActive).image}
                          alt={selectedCategory}
                          className="w-64 h-48 object-cover rounded-lg shadow-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {selectedCategory === "all" ? "All Products" : selectedCategory}
                </h1>
                <p className="text-gray-600 mt-1">{products.length} products found</p>
              </div>

              {/* Sort Dropdown */}
              <div className="mt-4 sm:mt-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name: A to Z</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.slice(0, productsToShow).map((product) => (
                    <HomeStyleProductCard key={product._id} product={product} />
                  ))}
                </div>
                {productsToShow < products.length && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => setProductsToShow((prev) => prev + 20)}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-colors font-semibold"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg">No products found</div>
                <p className="text-gray-400 mt-2">Try adjusting your filters or search terms</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Shop
