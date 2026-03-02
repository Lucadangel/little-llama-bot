import React, { useEffect, useState } from 'react';
import { ProductCarousel } from '../components/ProductCarousel';
import products from '../lib/products.json';

const Chatbot = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [messages, setMessages] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [foundProducts, setFoundProducts] = useState<any[]>([]);

    useEffect(() => {
        const handleUserRequest = (userInput: string) => {
            const lowerCaseInput = userInput.toLowerCase();
            // Check for clothing requests or specific products
            if (lowerCaseInput.includes('clothes') || lowerCaseInput.includes('shirt') || lowerCaseInput.includes('pants')) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const filteredProducts = (products.products as any[]).filter((product) => 
                    product.category === 'clothes' || 
                    product.name.toLowerCase().includes(lowerCaseInput)
                );
                setFoundProducts(filteredProducts);
                setMessages(prev => [...prev, { text: 'Here are some products I found:', sender: 'bot' }]);
            }
        };

        // Example input handler (you can replace this with actual user input handling)
        handleUserRequest('I am looking for clothes');
    }, []);

    return (
        <div className="chat-container">
            {messages.map((message, index) => (
                <div key={index} className={`chat-message ${message.sender}`}>{message.text}</div>
            ))}
            {/* Render ProductCarousel if foundProducts is not empty */}
            {foundProducts.length > 0 && <ProductCarousel products={foundProducts} />}
        </div>
    );
};

export default Chatbot;
