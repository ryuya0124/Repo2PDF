import { colorMap } from '../../utils/colorMap.js';

// Parse highlighted HTML to segments with high contrast colors
export function parseHighlightedCode(html) {
  const segments = [];
  let currentText = '';
  let currentColor = '#24292e'; // High contrast default (was #abb2bf)
  let i = 0;
  
  while (i < html.length) {
    if (html.substr(i, 5) === '<span') {
      if (currentText) {
        segments.push({ text: currentText, color: currentColor });
        currentText = '';
      }
      
      const classMatch = html.substr(i).match(/class="([^"]+)"/);
      if (classMatch) {
        const className = classMatch[1].split(' ')[0];
        currentColor = colorMap[className] || '#24292e';
      }
      
      const closeTag = html.indexOf('>', i);
      i = closeTag + 1;
    } else if (html.substr(i, 7) === '</span>') {
      if (currentText) {
        segments.push({ text: currentText, color: currentColor });
        currentText = '';
      }
      currentColor = '#24292e';
      i += 7;
    } else if (html.substr(i, 4) === '&lt;') {
      currentText += '<';
      i += 4;
    } else if (html.substr(i, 4) === '&gt;') {
      currentText += '>';
      i += 4;
    } else if (html.substr(i, 5) === '&amp;') {
      currentText += '&';
      i += 5;
    } else if (html.substr(i, 6) === '&quot;') {
      currentText += '"';
      i += 6;
    } else if (html.substr(i, 6) === '&#x27;') {
      currentText += "'";
      i += 6;
    } else {
      currentText += html[i];
      i++;
    }
  }
  
  if (currentText) {
    segments.push({ text: currentText, color: currentColor });
  }
  
  return segments;
}
