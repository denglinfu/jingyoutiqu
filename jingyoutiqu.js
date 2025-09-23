// ==UserScript==
// @name         菁优题目提取器终极版（含上下标+分数拼接+通用表格+美化）
// @namespace    http://tampermonkey.net/
// @version      5.3
// @description  提取 pt1、pt2、pt6、pt11 区块内容，保留公式与结构，支持上下标、分数拼接、所有表格，弹窗显示并复制，美化按钮和弹窗
// @match        *://www.jyeoo.com/*
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    const btn = document.createElement('button');
    btn.textContent = '提取题干/选项/解答/答案';
    btn.style.position = 'fixed';
    btn.style.top = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '9999';
    btn.style.width = '180px';
    btn.style.height = '40px';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.background = '#FF5722';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '14px';

    // 递归解析节点为 LaTeX
    function parseMathNode(node) {
        let latex = '';
        if (!node) return latex;

        if (node.nodeType === Node.TEXT_NODE) {
            latex += node.textContent.trim();
            return latex;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            const cls = node.classList;

            // 分数
            if (cls.contains('mfrac')) {
                const zi = node.querySelector('.fracZi');
                const mu = node.querySelector('.fracMu');
                let num = '', den = '';
                if (zi) zi.childNodes.forEach(child => num += parseMathNode(child));
                if (mu) mu.childNodes.forEach(child => den += parseMathNode(child));
                if (num && den) latex += `\\frac{${num}}{${den}}`;
                return latex;
            }

            // 上下标结构（msubsup）
            if (cls.contains('msubsup')) {
                const base = node.querySelector('.msubsupCont');
                const sub = node.querySelector('.msub');
                const sup = node.querySelector('.msup');
                let baseText = '', subText = '', supText = '';
                if (base) baseText = parseMathNode(base);
                if (sub) subText = parseMathNode(sub);
                if (sup) supText = parseMathNode(sup);
                latex += baseText;
                if (subText) latex += `_{${subText}}`;
                if (supText) latex += `^{${supText}}`;
                return latex;
            }

            // 标准上下标
            if (node.tagName === 'SUP') {
                let sup = '';
                node.childNodes.forEach(child => sup += parseMathNode(child));
                latex += `^{${sup}}`;
                return latex;
            }
            if (node.tagName === 'SUB') {
                let sub = '';
                node.childNodes.forEach(child => sub += parseMathNode(child));
                latex += `_{${sub}}`;
                return latex;
            }

            // 普通数学符号
            if (cls.contains('math-letter') || cls.contains('mo')) {
                latex += node.textContent.trim();
                return latex;
            }

            // mrow 组
            if (cls.contains('mrow')) {
                node.childNodes.forEach(child => latex += parseMathNode(child));
                return latex;
            }

            // MathJye 容器
            if (cls.contains('MathJye')) {
                const mrow = node.querySelector('.mrow');
                if (mrow) latex += parseMathNode(mrow);
                return latex;
            }

            // 其他元素递归
            node.childNodes.forEach(child => latex += parseMathNode(child));
            return latex;
        }

        return latex;
    }

    // 表格提取（通用）
    function extractTable(table) {
        let result = '';
        const rows = table.querySelectorAll('tr');
        rows.forEach(tr => {
            let line = '';
            const cells = tr.querySelectorAll('td');
            cells.forEach((td, i) => {
                line += parseMathNode(td).trim();
                if (i < cells.length - 1) line += ' ';
            });
            result += line.trim() + '\n';
        });
        return result;
    }

    // 提取题干/解答/答案（支持所有表格）
    function extractContent(block, label) {
        let result = `【${label}】\n`;
        let line = '';

        block.childNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'BR') {
                    result += line.trim() + '\n';
                    line = '';
                } else if (node.tagName === 'TABLE') {
                    result += extractTable(node);
                } else {
                    line += parseMathNode(node);
                }
            } else if (node.nodeType === Node.TEXT_NODE) {
                line += node.textContent.trim();
            }
        });

        if (line.trim()) result += line.trim() + '\n';
        return result.trim();
    }

    // 提取选项
    function extractOptions(block) {
        let result = '【选项】\n';
        const labels = block.querySelectorAll('.selectoption label');
        labels.forEach(label => {
            let line = '';
            label.childNodes.forEach(node => line += parseMathNode(node));
            result += line.trim() + '\n';
        });
        return result.trim();
    }

    btn.onclick = () => {
        const pt1 = document.querySelector('.pt1');
        const pt2 = document.querySelector('.pt2');
        const pt6 = document.querySelector('.pt6');
        const pt11 = document.querySelector('.pt11');

        let output = '';
        if (pt1) output += extractContent(pt1, '题干') + '\n\n';
        if (pt2) output += extractOptions(pt2) + '\n\n';
        if (pt6) output += extractContent(pt6, '解答') + '\n\n';
        if (pt11) output += extractContent(pt11, '答案') + '\n\n';

        if (!output.trim()) {
            alert('未找到题干、选项、解答或答案内容');
            return;
        }

        console.log(output);
        GM_setClipboard(output);

        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '50px';
        modal.style.right = '20px';
        modal.style.left = 'auto';
        modal.style.transform = 'none';
        modal.style.width = '400px';
        modal.style.maxHeight = '80vh';
        modal.style.overflowY = 'auto';
        modal.style.background = '#fff';
        modal.style.border = '2px solid #333';
        modal.style.padding = '20px';
        modal.style.zIndex = '10000';
        modal.style.fontFamily = 'monospace';
        modal.style.whiteSpace = 'pre-wrap';
        modal.style.textAlign = 'left';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.marginTop = '10px';
        closeBtn.style.padding = '5px 10px';
        closeBtn.style.background = '#333';
        closeBtn.style.color = '#fff';
        closeBtn.style.border = 'none';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => modal.remove();

        modal.textContent = output.trim();
        modal.appendChild(closeBtn);
        document.body.appendChild(modal);
    };

    document.body.appendChild(btn);
})();
