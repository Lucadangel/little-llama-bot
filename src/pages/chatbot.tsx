import React, { useEffect, useState } from 'react';
import { ProductCarousel } from './ProductCarousel';
import products from '../products.json';

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [foundProducts, setFoundProducts] = useState([]);

    useEffect(() => {
        const handleUserRequest = (userInput) => {
            const lowerCaseInput = userInput.toLowerCase();
            // Check for clothing requests or specific products
            if (lowerCaseInput.includes('clothes') || lowerCaseInput.includes('shirt') || lowerCaseInput.includes('pants')) {
                const filteredProducts = products.filter(product => 
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

/* CSS Styling should be added separately for the bubble messages and responsive layout */

.chat-container {
    display: flex;
    flex-direction: column;
    margin: 0 auto;
    max-width: 600px;
}

.chat-message {
    border-radius: 10px;
    padding: 10px;
    margin: 5px;
    max-width: 80%;
}

.chat-message.bot {
    background-color: #e4f0f6;
    align-self: flex-start;
}

.chat-message.user {
    background-color: #d1ffd1;
    align-self: flex-end;
}