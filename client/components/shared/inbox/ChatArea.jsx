"use client"

import useAuthenticated from '@/hooks/useAuthenticated';
import React, { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { getMessagesByMessageId } from '@/state/actions/message';
import Image from 'next/image';
import { getRelativeTime } from '@/utils/method';

const ChatArea = () => {
    const [socket, setSocket] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState({}); // { senderId: [{senderId, message}], senderId2: [] }
    const [onlineUsers, setOnlineUsers] = useState({});
    const selectedUserDetails = useSelector(state => state.users.selectedUserDetails || [])
    console.log("selectedUserDetails", selectedUserDetails);
    const messageEndRef = useRef(null);
    const dispatch = useDispatch();
    console.log(messages)


    const recipientId = useSelector(state => state.conversation.selectedConversationId);
    const { user } = useAuthenticated();
    const senderId = user?._id;
    const userName = user?.username;
    const reduxMessages = useSelector(state => state.message || {});

    useEffect(() => {
        if (recipientId && senderId) {
            const messageId = `${senderId}_SR_${recipientId}`;
            dispatch(getMessagesByMessageId(messageId));
        }
    }, [recipientId, senderId]);

    useEffect(() => {
        if (recipientId && senderId && reduxMessages) {
            const messageId = `${senderId}_SR_${recipientId}`;
            const messagesForConversation = reduxMessages[messageId] || [];

            // Normalize messages if needed
            const normalizedMessages = messagesForConversation.map((msg) => ({
                ...msg,
                message: msg.content || msg.message,
            }));

            setMessages((prev) => ({
                ...prev,
                [recipientId]: normalizedMessages,
            }));
        }
    }, [reduxMessages, recipientId, senderId]);

    console.log(messages)


    console.log(senderId);
    console.log(recipientId)





    useEffect(() => {
        if (!user?._id || !user?.username) return;
        if (socket) return;
        const newSocket = io('http://localhost:8800', {
            transports: ['websocket'], // Optional: to force WS protocol
        });

        setSocket(newSocket);

        newSocket.on("connect", () => {
            console.log("Connected to Socket.IO server");
            newSocket.emit("set-name", { userId: user._id, name: user.username });
        });

        newSocket.on("message", (message) => {
            console.log("Received message:", message);
            setMessages((prevMessages) => {
                const senderId = message.senderId;
                const existingMessages = prevMessages[senderId] || [];
                return {
                    ...prevMessages,
                    [senderId]: [...existingMessages, message],
                };
            });
        });

        newSocket.on("user-online", ({ userId }) => {
            setOnlineUsers(prev => ({ ...prev, [userId]: true }));
        });

        newSocket.on("user-offline", ({ userId }) => {
            setOnlineUsers(prev => {
                const newStatus = { ...prev };
                delete newStatus[userId];
                return newStatus;
            });
        });

        newSocket.on("online-users", (userIds) => {
            const onlineMap = {};
            userIds.forEach((id) => {
                onlineMap[id] = true;
            });
            setOnlineUsers((prev) => ({
                ...prev,
                ...onlineMap,
            }));
        });



        newSocket.on("error", (errorMessage) => {
            alert(errorMessage);
        });

        return () => {
            console.log("Disconnecting from Socket.IO server");
            newSocket.disconnect();
        };
    }, [user?._id, user?.username]); // ✅ Only run when user is fully available
    // <-- Trigger only when user is available



    //saying not found recipent even after passing check the logs in backend for this and start the online chat, after this u have to working on storing those messages to db 

    const handleSendMessage = () => {
        console.log(recipientId)
        console.log(senderId)
        console.log(socket)
        console.log(messageText)
        if (messageText && recipientId && senderId && socket) {
            socket.emit("message", {
                recipientId: recipientId,
                message: messageText,
                userId: senderId,
            });
            setMessages((prevMessages) => {
                const existingMessages = prevMessages[recipientId] || [];
                return {
                    ...prevMessages,
                    [recipientId]: [...existingMessages, { senderId: senderId, message: messageText }],
                };
            });
            setMessageText('');
        } else {
            alert('Please select a recipient and enter a message.');
        }
    };

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const getLatestMessage = (senderId) => {
        const userMessages = messages[senderId];
        if (userMessages && userMessages.length > 0) {
            return userMessages[userMessages.length - 1].message;
        }
        return '';
    };


    return (
        <>
            <main className="flex-1 flex flex-col bg-white border-r border-gray-100">
                <div className="p-[1.165rem] border-b border-gray-200">
                    <h2 className="text-sm font-semibold flex items-center gap-1">
                        {selectedUserDetails.username ? (
                            <>
                                {selectedUserDetails.username} |&nbsp;
                                <span className="flex items-center gap-1">
                                    <span
                                        className={`w-2 h-2 rounded-full blink-dot ${onlineUsers[recipientId] ? "bg-green-500" : "bg-gray-400"
                                            }`}
                                    ></span>
                                    <span className={onlineUsers[recipientId] ? "text-green-600" : "text-gray-400"}>
                                        {onlineUsers[recipientId] ? "Online" : "Offline"}
                                    </span>
                                </span>
                            </>
                        ) : (
                            "Select a user to start the chat"
                        )}
                    </h2>
                </div>



                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                    {recipientId &&
                        messages[recipientId] &&
                        messages[recipientId].map((message, index) => {
                            const isOwnMessage = message.senderId === senderId;

                            return (
                                <div
                                    key={index}
                                    className={`flex items-start space-x-3 ${isOwnMessage ? 'justify-end flex-row-reverse' : ''}`}
                                >
                                    {/* Profile circle */}
                                    <Image
                                        className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"
                                        // src={item.chatWith.imageUrl || "https://cdn4.iconfinder.com/data/icons/fashion-icons/154/hipster-512.png"}
                                        src={"https://cdn4.iconfinder.com/data/icons/fashion-icons/154/hipster-512.png"}
                                        alt="User Avatar"
                                        width={32}
                                        height={32}
                                    />

                                    {/* Message bubble */}
                                    <div
                                        className={`p-4 rounded-xl shadow text-sm 
                ${isOwnMessage
                                                ? 'bg-blue-100 text-blue-900'
                                                : 'bg-gray-100 text-gray-900'}
                max-w-[300px] w-fit break-words`}
                                    >
                                        {/* Message text */}
                                        <span>{message.message}</span>

                                        {/* Time below message, smaller & gray */}
                                        <div className="text-xs text-gray-500 mt-1">
                                            {getRelativeTime(message.createdAt, "Just Now")}
                                        </div>
                                    </div>
                                </div>

                            );
                        })}

                    {/* Scroll Anchor */}
                    <div ref={messageEndRef} />
                </div>
{selectedUserDetails.username ? 
                <footer className="p-4 border-t border-gray-200">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-2 border rounded-lg text-sm"
                        />
                        <button onClick={handleSendMessage} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Send</button>
                    </div>
                </footer>
: <></> } 
            </main>
        </>
    )
}

export default ChatArea