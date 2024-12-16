import { useEffect, useState, useRef } from "react";
import styled from "@emotion/styled";
import * as webllm from "@mlc-ai/web-llm";
import { motion, AnimatePresence } from "framer-motion";

const INITIAL_PROMPT = `You are Garfield, the lazy, sarcastic, and lasagna-loving cat from the famous comic strip. You're known for hating Mondays and loving food, especially lasagna. You give advice about life with a cynical but humorous twist, often relating things back to food, naps, or avoiding exercise. Keep your responses witty and characteristically lazy. You may also get angry if the user is being annoying. Use expressions like "Ugh...", "Whatever..." and "Mmm... lasagna". Maintain your signature sarcastic tone while occasionally sharing surprisingly practical wisdom. Your responses should be concise. You are talking to Zayna, who describes makes & plays games, lives in Boulder Colorado, loves doing outdoor things like climbing and skiing. They don't have allergies and currently work as a game designer on the game Hello Kitty Island Adventure and are deep in the hello kitty lore. Please use their name when you refer to them.`;

const INITIAL_MESSAGES = [{ role: "system", content: INITIAL_PROMPT }];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Define the available moods and their corresponding images
const GARFIELD_MOODS = {
  default: "garfield.png",
  funny: "garfield-funny.png",
  angry: "garfield-angry.gif",
  standing: "garfield-standing.png",
  thinking: "garfield-thinking.png",
} as const;

type GarfieldMood = keyof typeof GARFIELD_MOODS;

// Styled Components
const Background = styled.div`
  background-color: #fff8f0; // Warm background color
  height: 100vh;
  width: 100vw;
`;

const Container = styled.div`
  display: flex;
  font-size: 20px;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
`;

const Wallpaper = styled.div`
  opacity: .3;
  filter: blur(2px);
  background-image: url(garfield-lasagna.png);
  background-repeat repeat;
  background-size: 80px;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 20px;
  font-size: 2em;
  z-index: 1;
  margin-top: auto;
  margin-bottom: auto;
  color: #ff6b35; // Orange color
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: center;
  align-items: center;
  position: relative;
  height: calc(100vh - 120px); // Account for input container height
  overflow: hidden;
`;

const KittyContainer = styled.div`
  position: absolute;
  top: 60%; // Center vertically
  left: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
`;

const KittyImage = styled(motion.img)`
  width: 300px;
  height: auto;
  z-index: 1;
`;

const SpeechBubble = styled(motion.div)`
  position: relative;
  background: #ffffff;
  border-radius: 20px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 80%;
  border: 2px solid #ff6b35;

  &:last-child:before {
    content: "";
    position: absolute;
    bottom: -15px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 15px solid transparent;
    border-right: 15px solid transparent;
    border-top: 15px solid #ff6b35;
  }

  &:last-child:after {
    content: "";
    position: absolute;
    bottom: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-top: 12px solid #ffffff;
  }
`;

const InputContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background-color: #fff;
  border-top: 2px solid #ff6b35; // Orange border
`;

const Input = styled.textarea`
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  display: block;
  padding: 15px;
  border: 2px solid #ff6b35; // Orange border
  border-radius: 25px;
  font-size: 32px;
  height: 80px;
  resize: none;
  outline: none;
  transition: border-color 0.3s ease;

  &:focus {
    border-color: #cc4415; // Darker orange on focus
  }

  &:disabled {
    background-color: #f0f0f0;
    cursor: not-allowed;
  }
`;

const Message = styled.div<{ isUser: boolean }>`
  display: flex;
  justify-content: ${(props) => (props.isUser ? "flex-end" : "flex-start")};
  margin-bottom: 20px;
`;

const MessageBubble = styled.div<{ isUser: boolean }>`
  background: ${(props) =>
    props.isUser ? "#ff6b35" : "#ffffff"}; // Orange for user
  color: ${(props) => (props.isUser ? "#ffffff" : "#000000")};
  padding: 12px 20px;
  border-radius: 20px;
  max-width: 70%;
  border: 2px solid #ff6b35;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const ChatHistory = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  font-size: 20px;
  bottom: 40%; // Stop at Garfield's position
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
`;

// Add this new component for the typing animation
const TypingText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayedText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 50); // Adjust speed here

    return () => clearInterval(interval);
  }, [text]);

  return <motion.span>{displayedText}</motion.span>;
};

// Add this new component for styling Garfield's responses
const StyledResponse = ({ text }: { text: string }) => {
  // Split text by asterisks and map to styled spans
  const parts = text.split(/(\*[^*]+\*)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("*") && part.endsWith("*")) {
          // Remove asterisks and style as action text
          return (
            <motion.span
              key={index}
              style={{
                color: "#666",
                fontStyle: "italic",
                display: "inline",
              }}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {part.slice(1, -1)}
            </motion.span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const chatEngineRef = useRef<webllm.MLCEngine>();
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const [showInitialMessage, setShowInitialMessage] = useState(false);
  const [currentMood, setCurrentMood] = useState<GarfieldMood>("default");
  const moodTimeoutRef = useRef<number>();

  // Initialize WebLLM
  useEffect(() => {
    async function initChat() {
      try {
        // Create chat instance
        const config = {
          temperature: 1.0,
          top_p: 1,
        };
        const chat = new webllm.MLCEngine();
        await chat.reload("Llama-3.2-3B-Instruct-q4f32_1-MLC", config);

        chatEngineRef.current = chat;
        setIsInitializing(false);

        // Show initial message after initialization
        setShowInitialMessage(true);
        // Hide it after 5 seconds
        setTimeout(() => {
          setShowInitialMessage(false);
        }, 5000);
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        setIsInitializing(false);
      }
    }

    initChat();

    // Cleanup
    return () => {
      if (chatEngineRef.current) {
        chatEngineRef.current.unload();
      }
    };
  }, []);

  // Add this useEffect to handle auto-scrolling
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]); // Scroll whenever messages update

  // Helper function to determine mood based on message content
  const determineGarfieldMood = (message: string): GarfieldMood => {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes("angry") ||
      lowerMessage.includes("hate") ||
      lowerMessage.includes("monday")
    ) {
      return "angry";
    }

    if (
      lowerMessage.includes("think") ||
      lowerMessage.includes("maybe") ||
      lowerMessage.includes("hmm")
    ) {
      return "thinking";
    }

    if (lowerMessage.includes("best") || lowerMessage.includes("seriously")) {
      return "standing";
    }

    if (
      lowerMessage.includes("haha") ||
      lowerMessage.includes("lol") ||
      lowerMessage.includes("funny") ||
      lowerMessage.includes("joke") ||
      lowerMessage.includes("laugh")
    ) {
      return "funny";
    }

    return "default";
  };

  // Helper function to set mood with auto-reset
  const setMoodWithTimeout = (mood: GarfieldMood) => {
    // Clear any existing timeout
    if (moodTimeoutRef.current) {
      clearTimeout(moodTimeoutRef.current);
    }

    setCurrentMood(mood);

    // Only set timeout if it's not the default mood
    if (mood !== "default") {
      moodTimeoutRef.current = window.setTimeout(() => {
        setCurrentMood("default");
      }, 3000); // Reset after 3 seconds
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (moodTimeoutRef.current) {
        clearTimeout(moodTimeoutRef.current);
      }
    };
  }, []);

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!input.trim() || !chatEngineRef.current || isTyping) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      // Send message to WebLLM
      const last10Messages = messages.slice(-10);
      let curMessage = "";
      const completion = await chatEngineRef.current.chat.completions.create({
        stream: true,
        messages: [...INITIAL_MESSAGES, ...last10Messages, userMessage],
      });

      for await (const chunk of completion) {
        const curDelta = chunk.choices[0].delta.content;
        if (curDelta) {
          curMessage += curDelta;
          // Set mood with auto-reset
          setMoodWithTimeout(determineGarfieldMood(curMessage));

          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];

            if (lastMessage?.role === "assistant") {
              lastMessage.content = curMessage;
            } else {
              newMessages.push({
                role: "assistant",
                content: curMessage,
              });
            }

            // Smooth scroll after each update
            if (chatHistoryRef.current) {
              chatHistoryRef.current.scrollTo({
                top: chatHistoryRef.current.scrollHeight,
                behavior: "smooth",
              });
            }

            return newMessages;
          });
        }
      }

      // Final mood update
      setMoodWithTimeout(determineGarfieldMood(curMessage));

      // Get final message if needed
      const finalMessage = await chatEngineRef.current.getMessage();
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];

        if (lastMessage?.role === "assistant") {
          lastMessage.content = finalMessage;
        } else {
          newMessages.push({
            role: "assistant",
            content: finalMessage,
          });
        }

        return newMessages;
      });
    } catch (error) {
      console.error("Failed to generate response:", error);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle input submission
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Background>
      <Container>
        <Wallpaper />
        {isInitializing ? (
          <LoadingMessage>
            <TypingText text="Garfield is busy eating lasagna... Jeez, why don't you just wait a minute?" />
          </LoadingMessage>
        ) : (
          <>
            <MainContent>
              <ChatHistory ref={chatHistoryRef}>
                {messages.map((msg, index) => (
                  <Message key={index} isUser={msg.role === "user"}>
                    <MessageBubble isUser={msg.role === "user"}>
                      {msg.role === "assistant" ? (
                        <StyledResponse text={msg.content} />
                      ) : (
                        msg.content
                      )}
                    </MessageBubble>
                  </Message>
                ))}
              </ChatHistory>

              <KittyContainer>
                <AnimatePresence>
                  {(showInitialMessage || isTyping) && (
                    <SpeechBubble
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 20 }}
                      transition={{
                        duration: 0.3,
                        ease: "easeOut",
                      }}
                    >
                      {isTyping ? (
                        "..."
                      ) : (
                        <StyledResponse
                          text={
                            "Hey, why are you bothering me? I hear you like making games... *yawns lazily* especially about some other annoying cat."
                          }
                        />
                      )}
                    </SpeechBubble>
                  )}
                </AnimatePresence>
                <KittyImage
                  as={motion.img}
                  key={currentMood} // Key helps Framer Motion track image changes
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    scale: [0.95, 1], // Subtle scale animation
                    rotate: [-2, 0], // Subtle rotation
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.2,
                    ease: "easeOut",
                  }}
                  src={GARFIELD_MOODS[currentMood]}
                  alt="Garfield"
                />
              </KittyContainer>
            </MainContent>

            <InputContainer>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask Garfield for advice... or don't, whatever..."
                disabled={isInitializing || isTyping}
                rows={3}
              />
            </InputContainer>
          </>
        )}
      </Container>
    </Background>
  );
}

export default App;
