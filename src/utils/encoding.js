// 文字エンコーディング検出と変換
export async function detectAndDecodeFile(buffer) {
  // BOM をチェック
  if (buffer.length >= 3) {
    // UTF-8 BOM
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return { encoding: 'UTF-8 BOM', content: buffer.slice(3).toString('utf-8') };
    }
    // UTF-16 LE BOM
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
      return { encoding: 'UTF-16 LE', content: buffer.toString('utf16le') };
    }
    // UTF-16 BE BOM
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
      return { encoding: 'UTF-16 BE', content: buffer.swap16().toString('utf16le') };
    }
  }
  
  // UTF-8 として試す（最も一般的）
  try {
    const content = buffer.toString('utf-8');
    // 不正な UTF-8 シーケンスをチェック
    if (!content.includes('\uFFFD') || buffer.every(b => b < 0x80)) {
      return { encoding: 'UTF-8', content };
    }
  } catch (e) {
    // UTF-8 デコード失敗
  }
  
  // Shift_JIS を試す（日本語環境で一般的）
  try {
    const content = decodeShiftJIS(buffer);
    if (content && !content.includes('\uFFFD')) {
      return { encoding: 'Shift_JIS', content };
    }
  } catch (e) {
    // Shift_JIS デコード失敗
  }
  
  // ASCII/Latin1 フォールバック
  return { encoding: 'ASCII/Latin1', content: buffer.toString('latin1') };
}

// 簡易 Shift_JIS デコーダー（基本的な実装）
function decodeShiftJIS(buffer) {
  let result = '';
  let i = 0;
  
  while (i < buffer.length) {
    const b1 = buffer[i];
    
    // ASCII
    if (b1 < 0x80) {
      result += String.fromCharCode(b1);
      i++;
      continue;
    }
    
    // 半角カタカナ
    if (b1 >= 0xA1 && b1 <= 0xDF) {
      result += String.fromCharCode(0xFF61 + (b1 - 0xA1));
      i++;
      continue;
    }
    
    // Shift_JIS 2バイト文字
    if (i + 1 < buffer.length) {
      const b2 = buffer[i + 1];
      const code = (b1 << 8) | b2;
      
      // Shift_JIS から Unicode へ変換（簡易マッピング）
      // 完全な変換には外部ライブラリが必要
      const unicode = sjisToUnicode(code);
      if (unicode) {
        result += unicode;
        i += 2;
        continue;
      }
    }
    
    // デコード失敗
    result += '\uFFFD';
    i++;
  }
  
  return result;
}

// Shift_JIS から Unicode への簡易変換（基本的な範囲のみ）
function sjisToUnicode(code) {
  // ひらがな
  if (code >= 0x829F && code <= 0x82F1) {
    return String.fromCharCode(0x3041 + (code - 0x829F));
  }
  // カタカナ
  if (code >= 0x8340 && code <= 0x8396) {
    return String.fromCharCode(0x30A1 + (code - 0x8340));
  }
  // 漢字（JIS X 0208 第一水準の一部）
  // 完全な実装には大きなマッピングテーブルが必要
  return null;
}

// 改行コードを統一
export function normalizeLineEndings(content) {
  // CRLF を LF に統一
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
