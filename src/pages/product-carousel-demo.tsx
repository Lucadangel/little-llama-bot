import React, { useEffect, useState } from 'react';
import ProductCarousel from '../components/ProductCarousel';

const ProductCarouselDemo = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            const response = await fetch('/api/products');
            const data = await response.json();
            setProducts(data);
            setLoading(false);
        };
        fetchProducts();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1>Product Carousel Demo</h1>
            <ProductCarousel products={products} />
        </div>
    );
};

export default ProductCarouselDemo;