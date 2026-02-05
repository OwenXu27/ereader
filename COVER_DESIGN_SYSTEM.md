# Le Corbusier 建筑美学封面设计系统

## 概述

基于 **Le Corbusier Polychromie Architecturale 1959** 色彩体系的电子书封面生成系统，融合瑞士国际主义设计风格与建筑美学。

## 1. 色彩体系

### 1.1 Le Corbusier 1959 系列（20色）

每色包含四个属性：
- `name`: 色号（32001-32091）
- `bg`: 主背景色
- `text`: 文字色（确保对比度）
- `secondary`: 次要色块/图形色
- `accent`: 点缀色

```typescript
const LC1959 = [
  { name: '32001', bg: '#F5F3F0', text: '#1A1A18', secondary: '#E8E4E0', accent: '#D4D0C8' },
  { name: '32011', bg: '#E8E4E0', text: '#242220', secondary: '#D4D0C8', accent: '#C0BCB8' },
  { name: '32020', bg: '#F2E6A8', text: '#3D3520', secondary: '#E8D080', accent: '#D4C060' },
  { name: '32021', bg: '#D9C998', text: '#3A3020', secondary: '#C4B070', accent: '#B0A060' },
  { name: '32030', bg: '#E8B89D', text: '#4A3020', secondary: '#D09070', accent: '#B87860' },
  { name: '32031', bg: '#C9756A', text: '#2A1815', secondary: '#A05550', accent: '#804040' },
  { name: '32040', bg: '#A65E5E', text: '#FFF5F0', secondary: '#854040', accent: '#FFD4D0' },
  { name: '32041', bg: '#8B4A4A', text: '#FFF8F5', secondary: '#6A3535', accent: '#FFC8C0' },
  { name: '32050', bg: '#E8D0C8', text: '#4A3530', secondary: '#D0A898', accent: '#B89080' },
  { name: '32051', bg: '#C9A8A0', text: '#3A2825', secondary: '#A88078', accent: '#906860' },
  { name: '32060', bg: '#8B6A5A', text: '#FFF8F0', secondary: '#6A5040', accent: '#E8D8C8' },
  { name: '32061', bg: '#6A5045', text: '#FFF5F0', secondary: '#503830', accent: '#E0C8B8' },
  { name: '32070', bg: '#A8C8D8', text: '#1A2A35', secondary: '#7AA0B0', accent: '#5A8090' },
  { name: '32071', bg: '#4A6880', text: '#E8F0F5', secondary: '#385060', accent: '#A0B8C8' },
  { name: '32072', bg: '#3A5060', text: '#E8F0F8', secondary: '#2A3845', accent: '#90A8B8' },
  { name: '32080', bg: '#B8D0B8', text: '#253525', secondary: '#90B090', accent: '#709070' },
  { name: '32081', bg: '#6A8A6A', text: '#F0F8F0', secondary: '#506A50', accent: '#B8D0B8' },
  { name: '32082', bg: '#8A8A6A', text: '#282820', secondary: '#6A6A50', accent: '#505040' },
  { name: '32090', bg: '#C5C5C0', text: '#2A2A28', secondary: '#A0A098', accent: '#808078' },
  { name: '32091', bg: '#8A8A85', text: '#1A1A18', secondary: '#6A6A65', accent: '#505048' },
];
```

### 1.2 色彩选择策略

- 从20色中随机选择3种（主色、次要色、点缀色）
- 使用书名+作者的哈希确保同一本书颜色稳定
- 文字色已预定义确保对比度（浅色背景用深色文字，深色背景用浅色文字）

## 2. 字体设计

### 2.1 标题

```css
font-family: serif;
font-weight: 300;        /* 极细体 */
letter-spacing: -0.02em; /* 紧凑字距 */
line-height: 1.08;       /* 紧凑行高 */
```

**字号自适应**（根据标题长度）：
- 长度 > 22: `0.7rem`
- 长度 > 12: `0.88rem`
- 其他: `1.05rem`

**截断策略**：超过36字符截断为 `...`

### 2.2 作者

```css
font-size: 0.48rem;
letter-spacing: 0.22em;  /* 宽字距 */
text-transform: uppercase;
opacity: 0.55;
```

### 2.3 色号标注

```css
font-size: 0.35rem;
letter-spacing: 0.3em;
text-transform: uppercase;
opacity: 0.35;
```

## 3. 布局系统（14种混合布局）

### 3.1 色块类布局（6种）

| 布局名称 | 色块特征 | 文字区域 |
|---------|---------|---------|
| `block-top-heavy` | 上方42%大色块 | 下方55% |
| `block-bottom-heavy` | 下方48%大色块 | 上方52% |
| `block-left-band` | 左侧32%条带 + 中右18% | 右侧50% |
| `block-right-band` | 右侧28%条带 + 左下35% | 左侧62% |
| `block-diagonal` | 135°对角55%分割 | 右下45% |
| `block-corner-accent` | 右上40%/35% + 左下32%/30% | 中心偏左 |

#### 实现细节

**block-top-heavy**
```tsx
<div className="absolute top-0 left-0 right-0 h-[42%]" style={{ backgroundColor: secondary.secondary }} />
<div className="absolute top-[42%] left-0 w-[28%] h-[12%]" style={{ backgroundColor: accent.accent }} />
```

**block-diagonal**
```tsx
<div className="absolute inset-0" style={{ 
  background: `linear-gradient(135deg, ${secondary.secondary} 55%, transparent 55%)` 
}} />
```

### 3.2 图形类布局（8种）

| 布局名称 | 图形特征 | 文字区域 |
|---------|---------|---------|
| `shape-grid-dots` | 3×4点阵 + 焦点大圆 | 右下55% |
| `shape-vertical-lines` | 5条垂直线 + 1条粗线 | 右侧居中35% |
| `shape-horizontal-bars` | 散布水平条带 | 左下70% |
| `shape-corner-squares` | 对角角落方块群 | 中心偏右50% |
| `shape-diagonal-stripes` | 对角线 + 交叉方块 | 左下60% |
| `shape-circle-cluster` | 两个圆形群组 | 左侧居中55% |
| `shape-asymmetric-blocks` | 建筑立面块 | 右下55% |
| `shape-sparse-crosses` | 稀疏十字 + 中心点 | 正中心70% |

#### 实现细节

**shape-grid-dots**（点阵）
```tsx
{Array.from({ length: 4 }).map((_, row) =>
  Array.from({ length: 3 }).map((__, col) => (
    <div
      key={`${row}-${col}`}
      className="absolute w-1.5 h-1.5 rounded-full"
      style={{
        top: `${18 + row * 22}%`,
        left: `${15 + col * 28}%`,
        backgroundColor: secondary.secondary,
        opacity: 0.6,
      }}
    />
  ))
)}
{/* 焦点大圆 */}
<div className="absolute w-4 h-4 rounded-full" style={{ 
  top: '65%', right: '20%', 
  backgroundColor: accent.accent, 
  opacity: 0.4 
}} />
```

**shape-vertical-lines**（垂直线）
```tsx
{[0, 1, 2, 3, 4].map((i) => (
  <div
    key={i}
    className="absolute top-[10%] bottom-[15%] w-px"
    style={{
      left: `${20 + i * 15}%`,
      backgroundColor: secondary.secondary,
      opacity: i === 2 ? 0.5 : 0.2,  // 中间线更浓
    }}
  />
))}
{/* 粗线强调 */}
<div className="absolute top-[25%] bottom-[30%] w-1" style={{ 
  left: '50%', 
  backgroundColor: accent.accent, 
  opacity: 0.3 
}} />
```

**shape-horizontal-bars**（水平条带）
```tsx
<div className="absolute top-[12%] left-[8%] right-[40%] h-3" 
  style={{ backgroundColor: secondary.secondary, opacity: 0.5 }} />
<div className="absolute top-[22%] left-[12%] right-[60%] h-1.5" 
  style={{ backgroundColor: accent.accent, opacity: 0.4 }} />
<div className="absolute top-[32%] left-[5%] w-16 h-px" 
  style={{ backgroundColor: secondary.secondary, opacity: 0.3 }} />
<div className="absolute bottom-[25%] right-[10%] w-20 h-2" 
  style={{ backgroundColor: secondary.secondary, opacity: 0.35 }} />
<div className="absolute bottom-[15%] left-[15%] w-12 h-px" 
  style={{ backgroundColor: accent.accent, opacity: 0.25 }} />
```

**shape-sparse-crosses**（瑞士十字）
```tsx
<div className="absolute top-[15%] left-[15%]">
  <div className="absolute w-6 h-px" style={{ backgroundColor: secondary.secondary, opacity: 0.4 }} />
  <div className="absolute w-px h-6 -translate-y-1/2 left-3" style={{ backgroundColor: secondary.secondary, opacity: 0.4 }} />
</div>
<div className="absolute top-[60%] right-[20%]">
  <div className="absolute w-4 h-px" style={{ backgroundColor: accent.accent, opacity: 0.35 }} />
  <div className="absolute w-px h-4 -translate-y-1/2 left-2" style={{ backgroundColor: accent.accent, opacity: 0.35 }} />
</div>
<div className="absolute top-[40%] left-[50%] w-1.5 h-1.5 rounded-full" 
  style={{ backgroundColor: accent.accent, opacity: 0.3 }} />
```

## 4. 装饰元素

所有装饰元素透明度控制在 **15%-60%**，保持呼吸感。

| 元素 | 尺寸 | 透明度 | 用途 |
|-----|------|-------|------|
| 细水平线 | `w-10 h-px` | 0.3 | 分隔/节奏 |
| 小方块 | `w-2.5 h-2.5` | 0.25 | 点缀 |
| 细线框 | `w-7 h-7 border` | 0.2 | 几何强调 |
| 双水平线 | `w-8 + w-5` | 0.25/0.15 | 韵律 |
| 小圆点 | `w-1.5 h-1.5 rounded-full` | 0.2 | 焦点 |
| 垂直线 | `w-px h-8` | 0.2 | 高度强调 |
| 小矩形 | `w-5 h-2.5` | 0.15 | 点缀 |
| 十字 | `w-3.5 h-px + w-px h-3.5` | 0.2 | 瑞士风格 |

## 5. 布局选择算法

```typescript
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// 使用
const seed = hashString(title + author);
const primaryIndex = seed % 20;           // 主色
const secondaryIndex = (seed >> 3) % 20;  // 次要色
const accentIndex = (seed >> 6) % 20;     // 点缀色
const layoutIndex = seed % 14;            // 布局类型
```

## 6. 纸张纹理

SVG 噪声纹理叠加，极低透明度保持纯净：

```tsx
<div 
  className="absolute inset-0 pointer-events-none mix-blend-multiply"
  style={{
    opacity: 0.012,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
  }}
/>
```

## 7. 角落编号

瑞士风格色号标注：

```tsx
<div className="absolute text-[0.35rem] tracking-[0.1em]" style={{ opacity: 0.15 }}>
  LC {primary.name}
</div>
```

位置根据布局调整：
- 大多数布局：`top-4 right-4`
- 对角类布局：`bottom-4 left-4`

## 8. 完整 React 组件实现

见项目文件：`src/components/BookCover/LeCorbusierCover.tsx`

核心结构：
1. 色彩定义数组
2. 哈希函数
3. 14种布局条件渲染
4. 文字定位逻辑
5. 纸张纹理层

## 9. 设计原则

1. **留白至上**：图形/色块只占据30-60%画面
2. **几何秩序**：仅使用矩形、圆形、线条三种基本图形
3. **色彩克制**：单本书最多使用3种颜色
4. **功能优先**：文字区域始终避开图形/色块
5. **稳定复现**：相同书名+作者永远生成相同封面
