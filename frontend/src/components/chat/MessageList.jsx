import MessageItem from './MessageItem';

function MessageList({ messages }) {
  return (
    <>
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </>
  );
}

export default MessageList;
