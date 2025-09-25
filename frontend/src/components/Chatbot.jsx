import React, { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FiSend, FiMic, FiMicOff, FiUser, FiMessageSquare } from "react-icons/fi";

const ChatBot = () => {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I'm your AI assistant. How can I help you today?",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [listening, setListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Gemini client
  const genAI = new GoogleGenerativeAI("AIzaSyBDhNdslEfHxzYOyKJy1VGB7StDGy-8HWU");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start/stop voice input
  const toggleListening = () => {
    if (listening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setListening(false);
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in your browser!");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const rec = new SpeechRecognition();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = true; // Enable interim results
    rec.lang = "en-US";

    rec.onstart = () => {
      setListening(true);
      // Clear previous input when starting new recognition
      setQuestion("");
    };

    rec.onend = () => {
      setListening(false);
    };

    rec.onresult = (event) => {
      // Get the latest transcript
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join('');
      
      // Update the input field with the current transcript
      setQuestion(transcript);
    };

    rec.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setListening(false);
      
      // Show error message to user
      if (event.error === 'not-allowed') {
        alert('Please allow microphone access to use voice input.');
      } else if (event.error === 'audio-capture') {
        alert('No microphone was found. Please ensure a microphone is connected.');
      } else if (event.error === 'language-not-supported') {
        alert('The selected language is not supported.');
      }
    };

    try {
      rec.start();
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      setListening(false);
      alert("Error starting voice recognition. Please try again.");
    }
  };

  // Send message to Gemini
  const sendMessage = async (text = question) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const userMessage = { sender: "user", text: trimmedText };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setIsTyping(true);

    try {
      const result = await model.generateContent(trimmedText);
      const reply = result.response.text();

      // Simulate typing delay
      setTimeout(() => {
        const botMessage = { sender: "bot", text: reply };
        setMessages((prev) => [...prev, botMessage]);
        setIsTyping(false);

        // Speak response
        if ("speechSynthesis" in window) {
          const utter = new SpeechSynthesisUtterance(reply);
          window.speechSynthesis.speak(utter);
        }
      }, 1000);
    } catch (err) {
      console.error("Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, I encountered an error. Please try again.",
        },
      ]);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const [isOpen, setIsOpen] = useState(false);

  // Toggle chat window
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // Close chat when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const chatContainer = document.querySelector('.chat-container');
      const chatButton = document.querySelector('.chat-button');
      
      if (isOpen && chatContainer && !chatContainer.contains(event.target) && 
          chatButton && !chatButton.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button 
        onClick={toggleChat}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all duration-300 chat-button"
        aria-label="Open chat"
      >
        <FiMessageSquare className="text-2xl" />
      </button>
    );
  }

  // Check if mobile device
  const isMobile = window.innerWidth < 768; 

  return (
    <div 
      className={`fixed flex flex-col bg-white shadow-2xl overflow-hidden chat-container ${
        isMobile 
          ? 'inset-0 rounded-none w-full h-full' 
          : 'bottom-6 right-6 w-[500px] h-[700px] rounded-lg' 
      }`}
      style={{ zIndex: 1000 }}
    >
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3">
              <FiMessageSquare className="text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Chatbot</h1>
              <p className="text-xs opacity-80">Powered by AI Assistant</p>
              
            </div>
          </div>
          <button 
            onClick={toggleChat}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1"
            aria-label="Close chat"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 bg-gray-50">
        <div className="container mx-auto max-w-3xl">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex mb-4 ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex max-w-[80%] ${
                  msg.sender === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.sender === "user"
                      ? "bg-blue-100 text-blue-600 ml-2"
                      : "bg-gray-200 text-gray-600 mr-2"
                  }`}
                >
                  {msg.sender === "user" ? (
                    <FiUser />
                  ) : (
                    <FiMessageSquare />
                  )}
                </div>
                <div
                  className={`px-4 py-3 rounded-lg ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-white text-gray-800 shadow rounded-tl-none"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex mb-4">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                <FiMessageSquare className="text-gray-600" />
              </div>
              <div className="bg-white px-4 py-3 rounded-lg rounded-tl-none shadow">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 w-full">
        <div className="container mx-auto max-w-3xl">
          <div className="relative flex items-center bg-gray-100 rounded-lg px-4 py-2 shadow-inner">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={listening ? "Speak now..." : "Type your message..."}
              className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-500 pr-12"
              disabled={isTyping}
            />
            {question && (
              <button
                onClick={() => setQuestion("")}
                className="absolute right-16 p-1 text-gray-400 hover:text-gray-600"
                disabled={isTyping}
              >
                ✕
              </button>
            )}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleListening}
                className={`p-2 rounded-full transition-colors ${
                  listening
                    ? "bg-red-100 text-red-600 animate-pulse"
                    : "text-gray-500 hover:bg-gray-200"
                }`}
                disabled={isTyping}
                title={listening ? "Stop listening" : "Start voice input"}
              >
                {listening ? <FiMicOff /> : <FiMic />}
              </button>
              <button
                onClick={() => sendMessage()}
                disabled={!question.trim() || isTyping}
                className={`p-2 rounded-full ${
                  question.trim() && !isTyping
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                } transition-colors`}
                title="Send message"
              >
                <FiSend />
              </button>
            </div>
          </div>
          <p className="text-xs text-center text-gray-500 mt-2">
            {listening 
              ? "Speak now..." 
              : question 
                ? "Edit your message and click send" 
                : "Click the mic to speak or type your message"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
