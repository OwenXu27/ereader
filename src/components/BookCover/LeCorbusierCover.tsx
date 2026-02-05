import React from 'react';

// Le Corbusier 1959 Polychromie Architecturale 色彩体系
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

// 哈希函数 - 确保相同书名+作者生成相同封面
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// 14种布局类型
const LAYOUTS = [
  'block-top-heavy',
  'block-bottom-heavy',
  'block-left-band',
  'block-right-band',
  'block-diagonal',
  'block-corner-accent',
  'shape-grid-dots',
  'shape-vertical-lines',
  'shape-horizontal-bars',
  'shape-corner-squares',
  'shape-diagonal-stripes',
  'shape-circle-cluster',
  'shape-asymmetric-blocks',
  'shape-sparse-crosses',
] as const;

interface LeCorbusierCoverProps {
  title: string;
  author: string;
}

export const LeCorbusierCover: React.FC<LeCorbusierCoverProps> = ({
  title,
  author,
}) => {
  const seed = hashString(title + author);
  const primary = LC1959[seed % 20];
  const secondary = LC1959[(seed >> 3) % 20];
  const accent = LC1959[(seed >> 6) % 20];
  const layout = LAYOUTS[seed % 14];

  // 标题处理
  const displayTitle = title.length > 36 ? title.slice(0, 36) + '...' : title;
  const titleSize = displayTitle.length > 22 ? '0.7rem' : displayTitle.length > 12 ? '0.88rem' : '1.05rem';

  // 纸张纹理样式
  const paperTexture = {
    opacity: 0.015,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
  };

  const renderLayout = () => {
    switch (layout) {
      // ========== 色块类布局 ==========
      case 'block-top-heavy':
        return (
          <>
            <div className="absolute top-0 left-0 right-0 h-[42%]" style={{ backgroundColor: secondary.secondary }} />
            <div className="absolute top-[42%] left-0 w-[28%] h-[12%]" style={{ backgroundColor: accent.accent }} />
            {/* 装饰细线 */}
            <div className="absolute bottom-[20%] right-[8%] w-10 h-px" style={{ backgroundColor: secondary.secondary, opacity: 0.3 }} />
          </>
        );

      case 'block-bottom-heavy':
        return (
          <>
            <div className="absolute bottom-0 left-0 right-0 h-[48%]" style={{ backgroundColor: secondary.secondary }} />
            <div className="absolute bottom-[48%] right-0 w-[22%] h-[8%]" style={{ backgroundColor: accent.accent }} />
            <div className="absolute top-[15%] left-[10%] w-8 h-px" style={{ backgroundColor: accent.accent, opacity: 0.25 }} />
          </>
        );

      case 'block-left-band':
        return (
          <>
            <div className="absolute top-0 left-0 w-[32%] bottom-0" style={{ backgroundColor: secondary.secondary }} />
            <div className="absolute top-[35%] left-[18%] w-[18%] h-[25%]" style={{ backgroundColor: accent.accent }} />
            <div className="absolute top-[10%] right-[15%] w-6 h-px" style={{ backgroundColor: accent.accent, opacity: 0.3 }} />
          </>
        );

      case 'block-right-band':
        return (
          <>
            <div className="absolute top-0 right-0 w-[28%] bottom-0" style={{ backgroundColor: secondary.secondary }} />
            <div className="absolute bottom-[20%] left-[5%] w-[35%] h-[18%]" style={{ backgroundColor: accent.accent }} />
            <div className="absolute top-[20%] left-[12%] w-8 h-px" style={{ backgroundColor: secondary.secondary, opacity: 0.25 }} />
          </>
        );

      case 'block-diagonal':
        return (
          <>
            <div className="absolute inset-0" style={{ 
              background: `linear-gradient(135deg, ${secondary.secondary} 55%, transparent 55%)` 
            }} />
            <div className="absolute bottom-[15%] right-[12%] w-3 h-3 rounded-full" style={{ backgroundColor: accent.accent, opacity: 0.4 }} />
          </>
        );

      case 'block-corner-accent':
        return (
          <>
            <div className="absolute top-0 right-0 w-[40%] h-[35%]" style={{ backgroundColor: secondary.secondary }} />
            <div className="absolute bottom-0 left-0 w-[32%] h-[30%]" style={{ backgroundColor: accent.accent }} />
            <div className="absolute top-[45%] left-[45%] w-2 h-2" style={{ backgroundColor: secondary.secondary, opacity: 0.25 }} />
          </>
        );

      // ========== 图形类布局 ==========
      case 'shape-grid-dots':
        return (
          <>
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
            <div className="absolute w-4 h-4 rounded-full" style={{ 
              top: '65%', right: '20%', 
              backgroundColor: accent.accent, 
              opacity: 0.4 
            }} />
          </>
        );

      case 'shape-vertical-lines':
        return (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="absolute top-[10%] bottom-[15%] w-px"
                style={{
                  left: `${20 + i * 15}%`,
                  backgroundColor: secondary.secondary,
                  opacity: i === 2 ? 0.5 : 0.2,
                }}
              />
            ))}
            <div className="absolute top-[25%] bottom-[30%] w-1" style={{ 
              left: '50%', 
              backgroundColor: accent.accent, 
              opacity: 0.3 
            }} />
          </>
        );

      case 'shape-horizontal-bars':
        return (
          <>
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
          </>
        );

      case 'shape-corner-squares':
        return (
          <>
            <div className="absolute top-[12%] left-[10%] w-12 h-12" style={{ backgroundColor: secondary.secondary, opacity: 0.5 }} />
            <div className="absolute top-[18%] left-[16%] w-6 h-6" style={{ backgroundColor: accent.accent, opacity: 0.4 }} />
            <div className="absolute bottom-[15%] right-[12%] w-16 h-16" style={{ backgroundColor: secondary.secondary, opacity: 0.45 }} />
            <div className="absolute bottom-[22%] right-[18%] w-8 h-8" style={{ backgroundColor: accent.accent, opacity: 0.35 }} />
          </>
        );

      case 'shape-diagonal-stripes':
        return (
          <>
            <div className="absolute inset-0" style={{
              background: `repeating-linear-gradient(45deg, ${secondary.secondary} 0px, ${secondary.secondary} 2px, transparent 2px, transparent 20px)`,
              opacity: 0.4
            }} />
            <div className="absolute top-[30%] left-[20%] w-8 h-8" style={{ backgroundColor: accent.accent, opacity: 0.35 }} />
            <div className="absolute bottom-[25%] right-[25%] w-6 h-6" style={{ backgroundColor: accent.accent, opacity: 0.3 }} />
          </>
        );

      case 'shape-circle-cluster':
        return (
          <>
            <div className="absolute top-[15%] left-[12%] w-16 h-16 rounded-full" style={{ backgroundColor: secondary.secondary, opacity: 0.45 }} />
            <div className="absolute top-[25%] left-[20%] w-10 h-10 rounded-full" style={{ backgroundColor: accent.accent, opacity: 0.35 }} />
            <div className="absolute bottom-[20%] right-[15%] w-20 h-20 rounded-full" style={{ backgroundColor: secondary.secondary, opacity: 0.4 }} />
            <div className="absolute bottom-[30%] right-[22%] w-8 h-8 rounded-full" style={{ backgroundColor: accent.accent, opacity: 0.3 }} />
          </>
        );

      case 'shape-asymmetric-blocks':
        return (
          <>
            <div className="absolute top-[8%] left-[5%] w-[45%] h-[25%]" style={{ backgroundColor: secondary.secondary, opacity: 0.5 }} />
            <div className="absolute top-[38%] left-[15%] w-[25%] h-[15%]" style={{ backgroundColor: accent.accent, opacity: 0.4 }} />
            <div className="absolute bottom-[12%] right-[8%] w-[35%] h-[22%]" style={{ backgroundColor: secondary.secondary, opacity: 0.45 }} />
            <div className="absolute top-[20%] right-[12%] w-2.5 h-2.5" style={{ backgroundColor: accent.accent, opacity: 0.25 }} />
          </>
        );

      case 'shape-sparse-crosses':
        return (
          <>
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
            <div className="absolute bottom-[25%] left-[25%] w-5 h-px" style={{ backgroundColor: secondary.secondary, opacity: 0.25 }} />
          </>
        );

      default:
        return null;
    }
  };

  // 根据布局确定文字位置和色号位置
  const getTextPosition = () => {
    switch (layout) {
      case 'block-top-heavy':
      case 'shape-grid-dots':
      case 'shape-horizontal-bars':
        return 'bottom-4 left-4 right-4';
      case 'block-bottom-heavy':
      case 'shape-corner-squares':
        return 'top-4 left-4 right-4';
      case 'block-left-band':
        return 'top-1/2 -translate-y-1/2 left-[42%] right-4';
      case 'block-right-band':
        return 'top-1/2 -translate-y-1/2 left-4 right-[35%]';
      case 'block-diagonal':
        return 'bottom-4 right-4 text-right';
      case 'block-corner-accent':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-[70%]';
      case 'shape-vertical-lines':
        return 'top-1/2 -translate-y-1/2 right-[12%] text-right';
      case 'shape-diagonal-stripes':
        return 'bottom-4 left-4';
      case 'shape-circle-cluster':
        return 'top-1/2 -translate-y-1/2 left-[10%] w-[45%]';
      case 'shape-asymmetric-blocks':
        return 'top-4 right-4 text-right';
      case 'shape-sparse-crosses':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-[70%]';
      default:
        return 'bottom-4 left-4 right-4';
    }
  };

  const getNumberPosition = () => {
    if (layout === 'block-diagonal' || layout === 'shape-diagonal-stripes') {
      return 'bottom-4 left-4';
    }
    return 'top-4 right-4';
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      style={{ 
        backgroundColor: primary.bg,
        fontFamily: 'Georgia, "Times New Roman", Times, serif',
      }}
    >
      {/* 布局图形层 */}
      {renderLayout()}

      {/* 纸张纹理 */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-multiply"
        style={paperTexture}
      />

      {/* 色号标注 - 瑞士风格 */}
      <div 
        className={`absolute ${getNumberPosition()} text-[0.35rem] tracking-[0.3em] uppercase`} 
        style={{ opacity: 0.35, color: primary.text }}
      >
        LC {primary.name}
      </div>

      {/* 文字区域 */}
      <div 
        className={`absolute ${getTextPosition()}`}
        style={{ color: primary.text, zIndex: 10 }}
      >
        <h2 
          className="font-light leading-tight"
          style={{ 
            fontSize: titleSize,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            fontWeight: 300,
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          }}
        >
          {displayTitle}
        </h2>
        <p 
          className="mt-3 uppercase"
          style={{ 
            fontSize: '0.42rem',
            letterSpacing: '0.28em',
            opacity: 0.5,
            fontWeight: 400,
          }}
        >
          {author}
        </p>
      </div>
    </div>
  );
};

export default LeCorbusierCover;
