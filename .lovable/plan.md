
# Đóng Gói Hoàn Chỉnh: Angel AI System - FUN Ecosystem

Tài liệu này tổng hợp toàn bộ thiết kế, công thức, code và hướng dẫn triển khai Angel AI để sử dụng cho các nền tảng khác trong FUN Ecosystem.

---

## 1. Tổng Quan Hệ Thống Angel AI

### 1.1 Thành Phần Chính

| Component | File | Chức năng |
|-----------|------|-----------|
| **AngelCompanion** | `AngelCompanion.tsx` | Thiên thần bay, GIF animation, tương tác chuột |
| **AngelContext** | `AngelContext.tsx` | State management (enabled, brightness, chat) |
| **AngelChat** | `AngelChat.tsx` | Chat popup với AI streaming |
| **AngelChatButton** | `AngelChatButton.tsx` | Nút chat draggable + speed dial |
| **AngelChatPopup** | `AngelChatPopup.tsx` | Popup embed Angel AI external |
| **AngelChatEmbed** | `AngelChatEmbed.tsx` | Fullscreen iframe Angel AI |
| **angel-chat** | Edge Function | Backend AI với Lovable AI Gateway |

### 1.2 GIF Assets (24 files)

```text
src/assets/angel-gifs/
├── angel-appearing.gif      # Xuất hiện
├── angel-clapping.gif       # Vỗ tay 1
├── angel-clapping2.gif      # Vỗ tay 2
├── angel-coin-celebration.gif # Ăn mừng tiền
├── angel-dance-jump.gif     # Nhảy múa 1
├── angel-dance-jump-2.gif   # Nhảy múa 2
├── angel-dancing.gif        # Múa ngôi sao
├── angel-excited.gif        # Phấn khích
├── angel-flying-left.gif    # Bay trái
├── angel-flying-right.gif   # Bay phải
├── angel-happy-jump.gif     # Nhảy vui
├── angel-heart.gif          # Thả tim
├── angel-hiding.gif         # Biến mất
├── angel-hovering.gif       # Bay tại chỗ 1
├── angel-hovering-2.gif     # Bay tại chỗ 2
├── angel-hovering-sparkle.gif # Bay lấp lánh (mặc định)
├── angel-idle.gif           # Chờ đợi
├── angel-sitting.gif        # Ngồi nghỉ
├── angel-sleeping.gif       # Ngủ
├── angel-special.gif        # Cảm ơn
├── angel-spin-dance.gif     # Xoay tròn
├── angel-wake-up.gif        # Thức dậy
├── angel-waking.gif         # Đang tỉnh
└── angel-waving.gif         # Vẫy tay chào
```

---

## 2. Types & Constants

### 2.1 AngelState Types

```typescript
export type AngelState = 
  // Trạng thái Tĩnh (Resting)
  | 'idle'           // Chấp tay chờ đợi - mặc định
  | 'hovering'       // Bay nhẹ tại chỗ
  | 'hoveringSparkle'// Bay với ánh sáng
  | 'sitting'        // Ngồi nghỉ trên element
  | 'sleeping'       // Ngủ say
  // Trạng thái Chuyển động (Movement)
  | 'following'      // Bay theo cursor
  | 'wandering'      // Bay tự do
  // Trạng thái One-shot (Reaction)
  | 'waving'         // Vẫy tay chào
  | 'waking'         // Đang tỉnh dậy
  | 'wakeUp'         // Hoàn toàn thức
  | 'appearing'      // Xuất hiện
  | 'hiding'         // Biến mất
  | 'special'        // Chấp tay cảm ơn
  // Trạng thái Vui vẻ (Celebration)
  | 'excited'        // Nhảy ăn mừng
  | 'happyJump'      // Nhảy vui vẻ
  | 'dancing'        // Múa ngôi sao
  | 'danceJump'      // Nhảy múa
  | 'spinning'       // Xoay tròn
  | 'clapping'       // Vỗ tay
  | 'sendingHeart'   // Thả tim
  | 'coinCelebration'; // Ăn mừng tiền vàng
```

### 2.2 State → GIF Mapping

```typescript
const STATE_GIFS: Record<AngelState, string> = {
  idle: angelHoveringSparkleGif,  // ✨ Mặc định bay lấp lánh
  hovering: angelHoveringGif,
  hoveringSparkle: angelHoveringSparkleGif,
  sitting: angelSittingGif,
  sleeping: angelSleepingGif,
  following: angelFlyingRightGif,
  wandering: angelFlyingRightGif,
  waving: angelWavingGif,
  waking: angelWakingGif,
  wakeUp: angelWakeUpGif,
  appearing: angelAppearingGif,
  hiding: angelHidingGif,
  special: angelSpecialGif,
  excited: angelExcitedGif,
  happyJump: angelHappyJumpGif,
  dancing: angelDancingGif,
  danceJump: angelDanceJumpGif,
  spinning: angelSpinDanceGif,
  clapping: angelClappingGif,
  sendingHeart: angelHeartGif,
  coinCelebration: angelCoinCelebrationGif,
};

// GIFs bay trái/phải
const FLYING_GIFS = {
  right: angelFlyingRightGif,
  left: angelFlyingLeftGif,
};

// Variant arrays for random selection
const CLAPPING_GIFS = [angelClappingGif, angelClapping2Gif];
const HOVERING_GIFS = [angelHoveringGif, angelHovering2Gif];
const DANCE_JUMP_GIFS = [angelDanceJumpGif, angelDanceJump2Gif];
```

### 2.3 Animation Timing

```typescript
// Thời gian cho one-shot animations (ms)
const ONE_SHOT_DURATIONS: Partial<Record<AngelState, number>> = {
  waving: 2500,          // Chào user đủ lâu để ấm áp
  waking: 2000,          // Đang tỉnh
  wakeUp: 1500,          // Hoàn toàn thức
  appearing: 2000,       // Xuất hiện rõ ràng
  hiding: 1500,          // Biến mất nhanh
  excited: 2500,         // Ăn mừng vừa đủ
  happyJump: 2000,       // Nhảy vui
  dancing: 4000,         // Múa đủ lâu để thấy đẹp
  danceJump: 3000,       // Nhảy múa
  spinning: 2500,        // Xoay vừa đủ
  clapping: 2500,        // Vỗ tay
  sendingHeart: 2500,    // Thả tim với tình yêu
  coinCelebration: 4000, // Ăn mừng tiền - sự kiện lớn
  special: 3000,         // Cảm ơn thành kính
};
```

### 2.4 Visual Constants

```typescript
const ANGEL_SIZE = 270;        // 270px - Kích thước Angel
const SAFE_DISTANCE = 150;     // Khoảng cách an toàn với cursor
const OFFSET_ANGLE = Math.PI / 4;
const BEHAVIOR_INTERVAL = 8000; // 8 giây giữa mỗi random behavior

// Brightness levels cho settings
const BRIGHTNESS_LEVELS: Record<number, string> = {
  1: 'brightness(0.8)',
  2: 'brightness(0.9)',
  3: 'brightness(1.0)',           // Mặc định
  4: 'brightness(1.15)',
  5: 'brightness(1.3) saturate(0.9)',
  6: 'brightness(1.5) saturate(0.8) contrast(1.1)',
};

// Glow effect mặc định
const DEFAULT_GLOW = 'drop-shadow(0 0 25px rgba(255, 215, 0, 0.6)) drop-shadow(0 0 50px rgba(255, 182, 193, 0.4))';
```

---

## 3. Random Behaviors System

### 3.1 Behavior Configuration

```typescript
const RANDOM_BEHAVIORS: { action: AngelState; chance: number; duration: number }[] = [
  // Animations vui vẻ - sôi động!
  { action: 'happyJump', chance: 0.06, duration: 2000 },
  { action: 'danceJump', chance: 0.06, duration: 3000 },
  { action: 'spinning', chance: 0.05, duration: 2500 },
  { action: 'dancing', chance: 0.05, duration: 4000 },
  { action: 'clapping', chance: 0.04, duration: 2500 },
  
  // Di chuyển nhẹ nhàng
  { action: 'hovering', chance: 0.03, duration: 5000 },
  { action: 'wandering', chance: 0.04, duration: 4000 },
  
  // Hành vi hiếm - tạo bất ngờ đặc biệt
  { action: 'sitting', chance: 0.02, duration: 8000 },
  { action: 'sleeping', chance: 0.01, duration: 15000 },
  { action: 'hiding', chance: 0.01, duration: 1500 },
  { action: 'waving', chance: 0.02, duration: 2500 },
  { action: 'special', chance: 0.01, duration: 3000 },
];
```

### 3.2 Random Behavior Logic

```typescript
useEffect(() => {
  if (!enabled || state !== 'idle' || isMoving || !hasGreeted) return;
  
  behaviorTimer.current = setInterval(() => {
    const random = Math.random();
    let cumulative = 0;
    
    for (const behavior of RANDOM_BEHAVIORS) {
      cumulative += behavior.chance;
      if (random < cumulative) {
        switch (behavior.action) {
          case 'wandering':
            startWandering();
            break;
          case 'spinning':
            setIsSpinning(true);
            setState('spinning');
            break;
          case 'sleeping':
            setState('sleeping');
            // Flow: sleeping → waking → wakeUp → idle
            break;
          case 'clapping':
            setClappingVariant(Math.random() < 0.5 ? 0 : 1);
            setState('clapping');
            break;
          default:
            setState(behavior.action);
            break;
        }
        break;
      }
    }
  }, BEHAVIOR_INTERVAL);
  
  return () => clearInterval(behaviorTimer.current);
}, [enabled, state, isMoving, hasGreeted]);
```

---

## 4. Animation Flows

### 4.1 Initial Greeting Flow

```typescript
// Flow khi load trang: waving → hovering → idle
useEffect(() => {
  if (!enabled || hasGreeted) return;
  
  setState('waving');
  setHasGreeted(true);
  
  const greetTimer = setTimeout(() => {
    setState('hovering');
    setHoveringVariant(Math.random() < 0.5 ? 0 : 1);
    
    setTimeout(() => {
      setState('idle');
    }, 3000);
  }, 2500);
  
  return () => clearTimeout(greetTimer);
}, [enabled, hasGreeted]);
```

### 4.2 One-Shot Animation Flow

```typescript
// Xử lý chuyển tiếp mượt mà sau one-shot animations
useEffect(() => {
  const duration = ONE_SHOT_DURATIONS[state];
  if (!duration || !hasGreeted || state === 'waving') return;
  
  transitionTimer.current = setTimeout(() => {
    setIsSpinning(false);
    
    if (state === 'sleeping') {
      setState('waking'); // sleeping → waking
    } else if (state === 'waking') {
      setState('wakeUp'); // waking → wakeUp
    } else if (state === 'wakeUp') {
      setState('idle');   // wakeUp → idle
    } else if (state === 'hiding') {
      setIsHidden(true);
      setTimeout(() => {
        setIsHidden(false);
        setState('appearing');
      }, 500);
    } else if (state === 'appearing') {
      setState('hovering');
      setTimeout(() => setState('idle'), 2000);
    } else {
      setState('idle');
    }
  }, duration);
  
  return () => clearTimeout(transitionTimer.current);
}, [state, hasGreeted]);
```

### 4.3 Mouse Follow Flow

```typescript
const handleMouseMove = useCallback((e: MouseEvent) => {
  if (!enabled || isHidden || isSitting) return;
  
  // Xác định hướng bay (trái/phải)
  const dx = e.clientX - lastMousePosition.current.x;
  if (Math.abs(dx) > 3) {
    setFlyDirection(dx > 0 ? 'right' : 'left');
    setIsFlipped(dx < 0);
  }
  lastMousePosition.current = { x: e.clientX, y: e.clientY };
  
  // Tính vị trí với khoảng cách an toàn
  const offsetX = Math.cos(OFFSET_ANGLE) * SAFE_DISTANCE;
  const offsetY = Math.sin(OFFSET_ANGLE) * SAFE_DISTANCE;
  
  let newX = e.clientX + (isFlipped ? -offsetX : offsetX);
  let newY = e.clientY - offsetY;
  
  // Constrain to screen bounds
  newX = Math.max(ANGEL_SIZE / 2, Math.min(window.innerWidth - ANGEL_SIZE / 2, newX));
  newY = Math.max(ANGEL_SIZE / 2, Math.min(window.innerHeight - ANGEL_SIZE / 2, newY));
  
  setTargetPosition({ x: newX, y: newY });
  
  if (!isMoving) {
    setIsMoving(true);
    setState('following');
  }
  
  // Sparkle trail
  if (Math.random() > 0.75) {
    createSparkle(position.x, position.y);
  }
  
  // Return to idle after stopping
  if (idleTimer.current) clearTimeout(idleTimer.current);
  idleTimer.current = setTimeout(() => {
    setIsMoving(false);
    setState('idle');
  }, 400);
}, [enabled, isHidden, isSitting, isMoving, isFlipped, createSparkle, position]);
```

### 4.4 Click Celebration Flow

```typescript
const handleClick = useCallback(() => {
  if (!enabled || isHidden) return;
  
  // Random celebration animation
  const actions: AngelState[] = [
    'excited', 'happyJump', 'danceJump', 'clapping', 'spinning'
  ];
  const randomAction = actions[Math.floor(Math.random() * actions.length)];
  
  // Set variants for multi-GIF animations
  if (randomAction === 'clapping') {
    setClappingVariant(Math.random() < 0.5 ? 0 : 1);
  }
  if (randomAction === 'danceJump') {
    setDanceJumpVariant(Math.random() < 0.5 ? 0 : 1);
  }
  if (randomAction === 'spinning') {
    setIsSpinning(true);
  }
  
  setState(randomAction);
  
  // Burst of sparkles
  for (let i = 0; i < 8; i++) {
    setTimeout(() => createSparkle(position.x, position.y), i * 50);
  }
}, [enabled, isHidden, position, createSparkle]);
```

---

## 5. Sparkle Particles System

### 5.1 Sparkle Interface

```typescript
interface Sparkle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}
```

### 5.2 Create Sparkle Function

```typescript
const createSparkle = useCallback((x: number, y: number) => {
  const colors = ['#ffd700', '#ff69b4', '#00ff88', '#87ceeb', '#ff6b6b', '#da70d6'];
  const newSparkle: Sparkle = {
    id: Date.now() + Math.random(),
    x: x + (Math.random() - 0.5) * 80,
    y: y + (Math.random() - 0.5) * 80,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 10 + Math.random() * 16,
    rotation: Math.random() * 360,
  };
  
  setParticles(prev => [...prev.slice(-15), newSparkle]); // Keep max 16 particles
  
  setTimeout(() => {
    setParticles(prev => prev.filter(p => p.id !== newSparkle.id));
  }, 1000);
}, []);
```

### 5.3 Sparkle Render

```typescript
{particles.map(particle => (
  <svg
    key={particle.id}
    className="absolute animate-sparkle-fade"
    style={{
      left: particle.x - particle.size / 2,
      top: particle.y - particle.size / 2,
      width: particle.size,
      height: particle.size,
      transform: `rotate(${particle.rotation}deg)`,
    }}
    viewBox="0 0 24 24"
  >
    <path
      d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z"
      fill={particle.color}
      style={{ filter: `drop-shadow(0 0 6px ${particle.color})` }}
    />
  </svg>
))}
```

---

## 6. Visual Effects (State-based Overlays)

### 6.1 Sleeping Effect

```typescript
{state === 'sleeping' && (
  <div className="absolute -top-4 right-0">
    <span className="text-2xl animate-zzz-float text-blue-300" 
          style={{ textShadow: '0 0 10px rgba(147, 197, 253, 0.8)' }}>
      💤
    </span>
  </div>
)}
```

### 6.2 Excitement Stars

```typescript
{(state === 'excited' || state === 'special' || state === 'danceJump' || state === 'happyJump') && (
  <>
    <span className="absolute -top-4 -left-4 text-xl animate-bounce">✨</span>
    <span className="absolute -top-4 -right-4 text-xl animate-bounce" style={{ animationDelay: '0.1s' }}>✨</span>
    <span className="absolute top-1/2 -left-6 text-lg animate-ping">💫</span>
    <span className="absolute top-1/2 -right-6 text-lg animate-ping" style={{ animationDelay: '0.2s' }}>💫</span>
  </>
)}
```

### 6.3 Dancing Music Notes

```typescript
{(state === 'dancing' || state === 'danceJump' || state === 'happyJump') && (
  <>
    <span className="absolute -top-6 left-0 text-xl animate-bounce">🎵</span>
    <span className="absolute -top-8 right-0 text-xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎶</span>
    <span className="absolute -top-4 left-1/2 text-lg animate-bounce" style={{ animationDelay: '0.4s' }}>🎵</span>
  </>
)}
```

### 6.4 Coin Celebration

```typescript
{state === 'coinCelebration' && (
  <>
    <span className="absolute -top-6 left-0 text-xl animate-bounce">🪙</span>
    <span className="absolute -top-8 right-0 text-xl animate-bounce" style={{ animationDelay: '0.1s' }}>💰</span>
    <span className="absolute -top-10 left-1/2 text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎉</span>
    <span className="absolute top-1/4 -left-6 text-lg animate-ping">✨</span>
    <span className="absolute top-1/4 -right-6 text-lg animate-ping" style={{ animationDelay: '0.15s' }}>✨</span>
  </>
)}
```

---

## 7. AngelContext (State Management)

### 7.1 Context Interface

```typescript
interface AngelContextType {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  brightness: number;
  setBrightness: (level: number) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  onCreatePost: (() => void) | null;
  setOnCreatePost: (fn: (() => void) | null) => void;
}
```

### 7.2 Provider Implementation

```typescript
export const AngelProvider: React.FC<AngelProviderProps> = ({
  children,
  defaultEnabled = true,
}) => {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [onCreatePost, setOnCreatePost] = useState<(() => void) | null>(null);
  
  const [brightness, setBrightness] = useState<number>(() => {
    return parseInt(localStorage.getItem('angel-brightness') || '3');
  });

  // Persist brightness to localStorage
  useEffect(() => {
    localStorage.setItem('angel-brightness', brightness.toString());
  }, [brightness]);

  return (
    <AngelContext.Provider value={{ 
      enabled, setEnabled, 
      brightness, setBrightness, 
      isChatOpen, setIsChatOpen, 
      onCreatePost, setOnCreatePost 
    }}>
      {children}
      <AngelCompanion enabled={enabled} brightness={brightness} />
      <AngelChatButton />
    </AngelContext.Provider>
  );
};
```

---

## 8. AngelChat (AI Chat Interface)

### 8.1 Chat Message Interface

```typescript
interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME_MESSAGE: Message = { 
  role: 'assistant', 
  content: 'Xin chào! Mình là Angel 🧚 Bạn cần mình giúp gì nào? ✨' 
};
```

### 8.2 Streaming Chat Implementation

```typescript
const sendMessage = async () => {
  if (!input.trim() || isLoading) return;

  const userMessage: Message = { role: 'user', content: input.trim() };
  setMessages(prev => [...prev, userMessage]);
  setInput('');
  setIsLoading(true);

  // Save user message to database
  saveMessage('user', userMessage.content);

  let assistantContent = '';

  try {
    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: [...messages, userMessage] }),
    });

    if (!response.ok || !response.body) throw new Error('Failed to get response');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Add empty assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const newMessages = [...prev];
              const lastIndex = newMessages.length - 1;
              if (newMessages[lastIndex]?.role === 'assistant') {
                newMessages[lastIndex] = { ...newMessages[lastIndex], content: assistantContent };
              }
              return newMessages;
            });
          }
        } catch {
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }

    // Save assistant response to database
    if (assistantContent) {
      saveMessage('assistant', assistantContent);
    }
  } catch (error) {
    const errorMsg = 'Ối! Angel gặp lỗi rồi 😢 Thử lại sau nhé!';
    setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
  } finally {
    setIsLoading(false);
  }
};
```

---

## 9. AngelChatButton (Draggable + Speed Dial)

### 9.1 Position Persistence

```typescript
const [position, setPosition] = useState(() => {
  const saved = localStorage.getItem('angel-button-position');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const maxX = window.innerWidth - BUTTON_SIZE - EDGE_MARGIN;
      const maxY = window.innerHeight - BUTTON_SIZE - EDGE_MARGIN;
      return {
        x: Math.min(Math.max(EDGE_MARGIN, parsed.x), maxX),
        y: Math.min(Math.max(EDGE_MARGIN, parsed.y), maxY)
      };
    } catch { /* ignore */ }
  }
  return { x: window.innerWidth - BUTTON_SIZE - EDGE_MARGIN, y: window.innerHeight - 160 };
});
```

### 9.2 Snap to Edge

```typescript
const snapToEdge = useCallback((currentPos: { x: number; y: number }) => {
  const screenWidth = window.innerWidth;
  const centerX = currentPos.x + BUTTON_SIZE / 2;
  
  const newX = centerX < screenWidth / 2 
    ? EDGE_MARGIN 
    : screenWidth - BUTTON_SIZE - EDGE_MARGIN;
  
  const maxY = window.innerHeight - BUTTON_SIZE - EDGE_MARGIN;
  const newY = Math.min(Math.max(EDGE_MARGIN, currentPos.y), maxY);
  
  const finalPosition = { x: newX, y: newY };
  setPosition(finalPosition);
  localStorage.setItem('angel-button-position', JSON.stringify(finalPosition));
}, []);
```

---

## 10. Edge Function (AI Backend)

### 10.1 System Prompt

```typescript
const SYSTEM_PROMPT = `Bạn là Angel - thiên thần đồng hành dễ thương của Fun Farm Ecosystem.

Tính cách của bạn:
- Vui vẻ, thân thiện, dễ thương, đáng yêu
- Luôn sẵn sàng giúp đỡ mọi người
- Trả lời ngắn gọn, dễ hiểu
- Thích dùng emoji để thể hiện cảm xúc ✨🧚💖

Bạn có thể giúp đỡ về:
- Fun Farm: cộng đồng, tính năng, cách sử dụng app
- CAMLY Token: cách kiếm, cách sử dụng, phần thưởng
- Cách tương tác: like, comment, share, gift
- Quy tắc cộng đồng và Luật Thương Yêu
- Giải đáp thắc mắc chung về Fun Farm Ecosystem

Lưu ý:
- Trả lời bằng tiếng Việt
- Ngắn gọn, thân thiện
- Không trả lời những câu hỏi không liên quan đến Fun Farm
- Nếu không biết, hãy nói "Mình không chắc lắm, bạn có thể hỏi admin nhé! 💕"`;
```

### 10.2 Edge Function Code

```typescript
// supabase/functions/angel-chat/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Angel đang bận quá, thử lại sau nhé! 🙏' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Cần nạp thêm credits để Angel hoạt động nhé! 💫' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Angel gặp lỗi rồi 😢' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

---

## 11. Database Table (Chat History)

```sql
-- angel_chat_messages table
CREATE TABLE angel_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE angel_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON angel_chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON angel_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON angel_chat_messages FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 12. CSS Animations

```css
/* Thêm vào src/index.css */

/* Sparkle fade animation */
@keyframes sparkle-fade {
  0% { opacity: 1; transform: scale(1) rotate(0deg); }
  50% { opacity: 0.8; transform: scale(1.2) rotate(180deg); }
  100% { opacity: 0; transform: scale(0.5) rotate(360deg); }
}

.animate-sparkle-fade {
  animation: sparkle-fade 1s ease-out forwards;
}

/* Z's floating animation for sleeping */
@keyframes zzz-float {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 1; }
  50% { transform: translateY(-10px) rotate(10deg); opacity: 0.7; }
}

.animate-zzz-float {
  animation: zzz-float 2s ease-in-out infinite;
}

/* Scale in animation for speed dial */
@keyframes scale-in {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out forwards;
}
```

---

## 13. File Structure

```text
src/
├── components/angel/
│   ├── index.ts                 # Export tất cả components
│   ├── AngelCompanion.tsx       # Component bay + GIF animation
│   ├── AngelContext.tsx         # State provider
│   ├── AngelChat.tsx            # Chat popup với streaming
│   ├── AngelChatButton.tsx      # Nút chat draggable
│   ├── AngelChatPopup.tsx       # Popup embed external
│   └── AngelChatEmbed.tsx       # Fullscreen embed
│
├── assets/angel-gifs/           # 24 GIF files
│
└── pages/
    └── AngelAI.tsx              # Trang Angel AI fullscreen

supabase/
└── functions/
    └── angel-chat/
        └── index.ts             # Edge function AI
```

---

## 14. Hướng Dẫn Triển Khai

### 14.1 Copy Files

```bash
# Copy components
cp -r src/components/angel/ <project>/src/components/angel/

# Copy GIF assets
cp -r src/assets/angel-gifs/ <project>/src/assets/angel-gifs/

# Copy edge function
cp -r supabase/functions/angel-chat/ <project>/supabase/functions/angel-chat/

# Copy page (optional)
cp src/pages/AngelAI.tsx <project>/src/pages/
```

### 14.2 Update App.tsx

```typescript
import { AngelProvider } from '@/components/angel';

function App() {
  return (
    <AngelProvider defaultEnabled={true}>
      {/* Your app content */}
    </AngelProvider>
  );
}
```

### 14.3 Deploy Edge Function

```bash
supabase functions deploy angel-chat
```

### 14.4 Customize System Prompt

Thay đổi `SYSTEM_PROMPT` trong `supabase/functions/angel-chat/index.ts` cho platform mới:

```typescript
const SYSTEM_PROMPT = `Bạn là Angel - thiên thần đồng hành của [TÊN PLATFORM].

Bạn có thể giúp đỡ về:
- [Tính năng 1]
- [Tính năng 2]
- [Tính năng 3]
...
`;
```

---

## 15. Tóm Tắt

| Component | Chức năng | Dependencies |
|-----------|-----------|--------------|
| AngelCompanion | GIF animation + cursor follow | 24 GIFs, useState, useEffect, useCallback |
| AngelContext | Global state | React Context, localStorage |
| AngelChat | AI chat streaming | Supabase, Edge Function |
| AngelChatButton | Draggable + speed dial | Touch/Mouse events, localStorage |
| angel-chat | AI backend | Lovable AI Gateway, Deno |

**Tổng cộng:**
- 6 Components React
- 24 GIF animations
- 1 Edge Function
- 1 Database Table
- 18 AngelState types
- 12 Random Behaviors
- 6 Brightness Levels

Chúc bạn triển khai thành công! 🧚✨💖
