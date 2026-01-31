import { ChatProvider } from '../contexts';
import { ChatInterface } from '../components/chat';

function ChatPage() {
  return (
    <ChatProvider>
      <ChatInterface />
    </ChatProvider>
  );
}

export default ChatPage;
