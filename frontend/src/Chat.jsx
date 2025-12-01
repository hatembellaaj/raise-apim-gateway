import React, { useEffect, useRef, useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8096'

const Chat = () => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      if (!response.body) {
        console.error('No response body received from backend')
        setIsLoading(false)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let assistantContent = ''
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      let done = false
      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const data = line.replace(/^data:\s*/, '').trim()
              if (data === '[DONE]') {
                done = true
                break
              }
              try {
                const json = JSON.parse(data)
                const token = json.choices?.[0]?.delta?.content || ''
                if (token) {
                  assistantContent += token
                  setMessages((prev) => {
                    const updated = [...prev]
                    const lastIndex = updated.length - 1
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: assistantContent,
                    }
                    return updated
                  })
                }
              } catch (error) {
                console.error('Error parsing SSE data', error, data)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="app-container">
      <div className="chat-card">
        <div className="chat-header">
          <h2>Azure APIM AI Chat Sandbox</h2>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85 }}>
            Streaming tokens from Azure AI Foundry through API Management to your browser.
          </p>
        </div>

        <div className="messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-row ${msg.role}`}>
              <div className="bubble">{msg.content || (msg.role === 'assistant' ? '…' : '')}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="composer">
          <textarea
            placeholder="Ask something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={sendMessage} disabled={isLoading}>
            {isLoading ? 'Streaming…' : 'Send'}
          </button>
        </div>
        <div className="hint">
          Backend URL: <strong>{BACKEND_URL}</strong>
        </div>
      </div>
    </div>
  )
}

export default Chat
