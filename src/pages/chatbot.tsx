import React, { useState } from 'react';
import ProductCarousel from '../components/ProductCarousel';
import products from '../lib/products/products.json';

const Chatbot = () => {
  const [messages, setMessages] = useState([{ text: 'Welcome! How can I assist you today?', type: 'bot' }]);
  const [userInput, setUserInput] = useState('');

  const handleUserInput = (e) => {
    setUserInput(e.target.value);
  };

  const handleSendMessage = () => {
    const userMessage = { text: userInput, type: 'user' };
    setMessages([...messages, userMessage]);
    setUserInput('');

    // Intent parsing logic here (basic keyword matching)
    const keywords = ['vest', 'baby', 'shoes', 'blanket'];
    let foundProducts = [];

    keywords.forEach((keyword) => {
      if (userInput.toLowerCase().includes(keyword)) {
        foundProducts = foundProducts.concat(products.filter(product => product.name.toLowerCase().includes(keyword)));
      }
    });

    if (foundProducts.length > 0) {
      const productMessage = { text: 'Here are some products you might like:', type: 'bot' };
      setMessages(prev => [...prev, productMessage]);
    } else {
      const helpMessage = { text: 'I am here to help you find products based on your questions. Please ask anything!', type: 'bot' };
      setMessages(prev => [...prev, helpMessage]);
    }
  };

  return (
    <div>
      <div className="chat-window">
        {messages.map((msg, index) => (
          <div key={index} className={msg.type === 'bot' ? 'bot-message' : 'user-message'}>
            {msg.text}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={userInput}
        onChange={handleUserInput}
        placeholder="Type your question..."
      />
      <button onClick={handleSendMessage}>Send</button>
      {foundProducts.length > 0 && <ProductCarousel products={foundProducts} />}
    </div>
  );
};

export default Chatbot;