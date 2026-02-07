/**
 * Product detail UI. Renders as a React island so the Astro product page
 * stays minimal and avoids the compiler panic on this route.
 */
import { useState, useEffect, useRef } from 'react';
import type { Product } from '@lib/types';
import CartButton from './CartButton';

interface DisplayImage {
  sourceUrl: string;
  altText?: string | null;
}

interface MeasurementData {
  sizes: Array<{
    size: string;
    measurements: Record<string, string>;
  }>;
}

interface ProductDetailProps {
  product: Product;
  formattedPrice: string;
  displayImages: DisplayImage[];
  hasMultipleImages: boolean;
  btcpayAvailable: boolean;
  colorAttribute: { options: string[] } | undefined;
  sizeAttribute: { options: string[] } | undefined;
}

export default function ProductDetail({
  product,
  formattedPrice,
  displayImages,
  hasMultipleImages,
  btcpayAvailable,
  colorAttribute,
  sizeAttribute,
}: ProductDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({});
  const [measurementsOpen, setMeasurementsOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const touchStartY = useRef<number>(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const SWIPE_CLOSE_THRESHOLD = 80;

  const handleMobileTrayTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleMobileTrayTouchMove = (e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - touchStartY.current;
    // Only track downward swipes (positive dy)
    if (dy > 0) {
      setSwipeOffset(dy);
    }
  };

  const handleMobileTrayTouchEnd = () => {
    if (swipeOffset >= SWIPE_CLOSE_THRESHOLD) {
      setMeasurementsOpen(false);
      setSwipeOffset(0);
    } else {
      setSwipeOffset(0);
    }
  };

  const handleSizeClick = (size: string) => {
    const qty = sizeQuantities[size] ?? 0;
    if (qty === 0) return;
    setSelectedSize(size);
    const wrapper = document.getElementById('cart-button-wrapper');
    if (wrapper) {
      wrapper.setAttribute('data-selected-size', size);
      wrapper.dispatchEvent(new CustomEvent('size-selected', { detail: { size } }));
    }
  };

  // Fetch size quantities on mount
  useEffect(() => {
    if (!measurementsOpen) setSwipeOffset(0);
  }, [measurementsOpen]);

  useEffect(() => {
    if (!product.sizes?.length || !product.slug) return;
    fetch(`/api/product/${encodeURIComponent(product.slug)}/sizes`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.sizes || !Array.isArray(data.sizes)) return;
        const bySize: Record<string, number> = {};
        data.sizes.forEach((s: { size: string; quantity: number }) => {
          bySize[s.size] = s.quantity;
        });
        setSizeQuantities(bySize);
      })
      .catch(() => {});
  }, [product.slug, product.sizes?.length]);

  const categorySlug = product.productCategories?.nodes?.[0]?.slug;
  const categoryName = product.productCategories?.nodes?.[0]?.name;

  // Parse measurements data
  let measurementsData: MeasurementData | null = null;
  let measurementFields: string[] = [];
  
  if (product.measurements) {
    try {
      const parsed = JSON.parse(product.measurements);
      // Handle both array format [{ sizes: [...] }] and direct object format { sizes: [...] }
      measurementsData = Array.isArray(parsed) ? parsed[0] : parsed;
      
      // Extract measurement field names from first size
      if (measurementsData?.sizes?.[0]?.measurements) {
        measurementFields = Object.keys(measurementsData.sizes[0].measurements);
      }
    } catch (e) {
      console.error('Failed to parse measurements:', e);
    }
  }

  return (
    <div className="p-0">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 max-w-[1920px] mx-auto">
        {/* Left: Images */}
        <div className="w-full lg:border-r lg:border-gray-200 py-0 pb-6 flex flex-col relative overflow-hidden">
          {displayImages.length > 0 ? (
            <div className="sm:px-16 px-0 flex-1 flex flex-col">
              <div className="w-full aspect-square bg-white relative overflow-hidden group" style={{ minHeight: 0 }}>
                <div
                  className="relative h-full flex transition-transform duration-300"
                  style={{
                    width: `${displayImages.length * 100}%`,
                    transform: `translateX(-${currentImageIndex * (100 / displayImages.length)}%)`,
                  }}
                >
                  {displayImages.map((img, index) => (
                    <div
                      key={index}
                      className="shrink-0 h-full relative bg-white flex items-center justify-center"
                      style={{ width: `${100 / displayImages.length}%` }}
                    >
                      <img
                        src={img.sourceUrl}
                        alt={img.altText || product.name}
                        className="w-full h-full object-contain block"
                        loading={index === 0 ? 'eager' : 'lazy'}
                        width={800}
                        height={800}
                        decoding="async"
                      />
                    </div>
                  ))}
                </div>
                {hasMultipleImages && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCurrentImageIndex((i) => (i === 0 ? displayImages.length - 1 : i - 1))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-10"
                      aria-label="Previous image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentImageIndex((i) => (i === displayImages.length - 1 ? 0 : i + 1))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-10"
                      aria-label="Next image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
              {hasMultipleImages && (
                <div className="flex w-full gap-2 mt-4">
                  {displayImages.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCurrentImageIndex(index)}
                      className={`h-1 flex-1 transition-opacity ${index === currentImageIndex ? 'bg-black' : 'bg-gray-300'} hover:opacity-70 cursor-pointer`}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400">No image available</span>
            </div>
          )}

          {/* Desktop measurements tray - slides in from right */}
          {measurementsData && (
            <div
              id="measurements-tray"
              className={`hidden lg:block absolute top-0 left-0 right-0 bottom-0 bg-white z-50 transition-transform duration-500 ease-in-out overflow-y-auto ${measurementsOpen ? 'translate-x-0' : 'translate-x-full'}`}
              style={{ willChange: 'transform' }}
            >
              <div className="p-16 h-full flex flex-col">
                <button
                  type="button"
                  onClick={() => setMeasurementsOpen(false)}
                  className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
                  aria-label="Close measurements"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold uppercase tracking-wide mb-8">
                    <span className="text-black">■</span> MEASUREMENTS
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-3 px-4 font-bold uppercase">Size</th>
                          {measurementFields.map((field) => (
                            <th key={field} className="text-left py-3 px-4 font-bold uppercase">{field}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {measurementsData.sizes.map((sizeData) => (
                          <tr key={sizeData.size} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{sizeData.size}</td>
                            {measurementFields.map((field) => (
                              <td key={field} className="py-3 px-4">{sizeData.measurements[field]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop backdrop - covers right column when tray is open */}
          {measurementsData && (
            <div
              className={`hidden lg:block fixed inset-0 z-40 transition-opacity duration-300 ${measurementsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              onClick={() => setMeasurementsOpen(false)}
            />
          )}

          {/* Mobile measurements tray - slides up from bottom */}
          {measurementsData && (
            <>
              {/* Backdrop */}
              <div
                className={`lg:hidden fixed inset-0 bg-black/50 z-[99] transition-opacity duration-300 ${measurementsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setMeasurementsOpen(false)}
              />
              {/* Slide-up tray */}
              <div
                className={`lg:hidden fixed left-0 right-0 bottom-0 bg-white z-[100] rounded-t-2xl max-h-[80vh] overflow-y-auto ${swipeOffset === 0 ? 'transition-transform duration-300 ease-out' : ''}`}
                style={{
                  transform: measurementsOpen ? `translateY(${swipeOffset}px)` : 'translateY(100%)',
                }}
              >
                {/* Handle bar - swipe target for closing */}
                <div
                  className="flex justify-center pt-3 pb-4 touch-none shrink-0"
                  onTouchStart={handleMobileTrayTouchStart}
                  onTouchMove={handleMobileTrayTouchMove}
                  onTouchEnd={handleMobileTrayTouchEnd}
                >
                  <div className="w-12 h-1 bg-gray-300 rounded-full" />
                </div>
                <div className="px-4 pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold uppercase tracking-wide">
                      <span className="text-black">■</span> MEASUREMENTS
                    </h2>
                    <button
                      type="button"
                      onClick={() => setMeasurementsOpen(false)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                      aria-label="Close measurements"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-3 px-2 font-bold uppercase text-xs">Size</th>
                          {measurementFields.map((field) => (
                            <th key={field} className="text-left py-3 px-2 font-bold uppercase text-xs">{field}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {measurementsData.sizes.map((sizeData) => (
                          <tr key={sizeData.size} className="border-b border-gray-200">
                            <td className="py-3 px-2 font-medium">{sizeData.size}</td>
                            {measurementFields.map((field) => (
                              <td key={field} className="py-3 px-2">{sizeData.measurements[field]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Details */}
        <div className="flex flex-col py-0 pt-0 lg:pt-4">
          <nav className="text-sm text-gray-600 sm:px-8 px-4 pb-8" aria-label="Breadcrumb">
            <div className="overflow-x-auto scrollbar-hide sm:overflow-visible -mx-4 px-4 sm:mx-0 sm:px-0">
              <ol className="flex items-center gap-2 flex-nowrap sm:flex-wrap min-w-max sm:min-w-0">
              <li><a href="/" className="hover:text-gray-900 transition-colors">HOME</a></li>
              {categorySlug && categoryName && (
                <>
                  <li className="text-gray-400">/</li>
                  <li>
                    <a href={`/products?category=${encodeURIComponent(categorySlug)}`} className="hover:text-gray-900 transition-colors">
                      {categoryName.toUpperCase()}
                    </a>
                  </li>
                </>
              )}
              <li className="text-gray-400">/</li>
              <li className="text-gray-900 font-medium" aria-current="page">{product.name.toUpperCase()}</li>
              </ol>
            </div>
          </nav>

          <div className="text-xl font-bold uppercase tracking-wide text-gray-700 pb-0 sm:px-8 px-4">
            {product.name}
          </div>

          <div className="space-y-1 pt-4 sm:px-8 px-4">
            <div className="text-base tracking-wide">{formattedPrice}</div>
            <div className="text-xs text-gray-500">VAT EXCLUDED / EXCL. SHIPPING</div>
          </div>

          {product.sizes && product.sizes.length > 0 && (
            <div className="pt-4 sm:px-8 px-4" data-product-slug={product.slug}>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">Size</div>
              <div className="flex flex-wrap gap-2" id="size-selector" role="group" aria-label="Select size">
                {product.sizes.map(({ size, quantity }) => {
                  const qty = sizeQuantities[size] ?? quantity;
                  const outOfStock = qty === 0;
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      data-size={size}
                      data-quantity={qty}
                      disabled={outOfStock}
                      onClick={() => handleSizeClick(size)}
                      className={`size-option min-w-[3rem] px-3 py-2 text-sm border rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:line-through ${
                        isSelected ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-gray-800'
                      }`}
                      aria-pressed={isSelected}
                      aria-label={`Size ${size}${outOfStock ? ', out of stock' : `, ${qty} available`}`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-4 sm:px-8 px-4 pb-4 min-h-[60px]" id="cart-button-wrapper">
            {product.stockStatus === 'IN_STOCK' ? (
              <CartButton
                productId={product.id}
                productName={product.name}
                stripeCheckoutUrl={product.stripeCheckoutUrl}
                sizes={product.sizes}
                btcpayAvailable={btcpayAvailable}
              />
            ) : (
              <div className="h-[52px]" />
            )}
          </div>

          {product.shortDescription && (
            <div className="text-base leading-relaxed border-t border-gray-200 pt-6 sm:px-8 px-4 pb-6">
              <div dangerouslySetInnerHTML={{ __html: product.shortDescription }} />
            </div>
          )}

          {product.description && (
            <div className="text-base leading-relaxed border-t border-gray-200 pt-6 sm:px-8 px-4 pb-6">
              <div dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-200 pt-6 sm:px-8 px-4 pb-6">
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wide mb-4">
                <span className="text-black">■</span> DETAILS
              </div>
              {product.details ? (
                <div className="text-base leading-relaxed [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-1 [&_li]:leading-relaxed">
                  <div dangerouslySetInnerHTML={{ __html: product.details }} />
                </div>
              ) : (
                <>
                  {colorAttribute?.options?.length ? (
                    <div className="text-base">
                      <span className="font-medium uppercase">COLOR:</span> {colorAttribute.options.join(', ').toUpperCase()}
                    </div>
                  ) : null}
                  {measurementsData && (
                    <div className="text-base">
                      <button
                        type="button"
                        onClick={() => setMeasurementsOpen((prev) => !prev)}
                        className="uppercase underline hover:no-underline cursor-pointer"
                        aria-label="View measurements"
                      >
                        MEASUREMENTS
                      </button>
                    </div>
                  )}
                  {sizeAttribute?.options?.length ? (
                    <div className="text-base">
                      <span className="font-medium uppercase">SIZE:</span> {sizeAttribute.options.join(', ').toUpperCase()}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
