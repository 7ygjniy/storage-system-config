/**
 * 报告下载功能 - 完整jsPDF版
 * 
 * 此脚本为储能系统方案配置工具添加报告下载功能，支持PDF和图片格式
 * 不修改原始核心文件，通过外部注入方式实现功能扩展
 * 使用完整版jsPDF库，确保所有API方法可用
 */

// 等待DOM完全加载
document.addEventListener('DOMContentLoaded', function() {
    // 预加载所有必要的库，确保它们在iframe环境中正确加载
    preloadLibraries().then(() => {
        // 初始化下载按钮功能
        initDownloadButton();
    }).catch(error => {
        console.error('库预加载失败:', error);
    });
});

/**
 * 预加载所有必要的库
 * @returns {Promise} - 所有库加载完成的Promise
 */
function preloadLibraries() {
    return new Promise(async (resolve, reject) => {
        try {
            // 获取iframe元素
            const iframe = document.getElementById('main-content');
            const iframeWindow = iframe.contentWindow;
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            
            // 加载完整版jsPDF库
            await loadScriptToIframe(iframe, 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            
            // 加载html2canvas库
            await loadScriptToIframe(iframe, 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
            
            // 验证库是否正确加载
            if (typeof iframeWindow.html2canvas === 'undefined') {
                console.log('html2canvas未通过CDN正确加载，尝试使用备用源');
                await loadScriptToIframe(iframe, 'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js');
                
                // 再次验证
                if (typeof iframeWindow.html2canvas === 'undefined') {
                    throw new Error('无法加载html2canvas库，请检查网络连接');
                }
            }
            
            // 验证jsPDF是否正确加载
            if (typeof iframeWindow.jspdf === 'undefined') {
                console.log('jsPDF未通过CDN正确加载，尝试使用备用源');
                await loadScriptToIframe(iframe, 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js');
                
                // 再次验证
                if (typeof iframeWindow.jspdf === 'undefined') {
                    console.error('jsPDF未能通过备用CDN加载，尝试内联加载');
                    
                    // 使用fetch获取jsPDF库内容
                    try {
                        const response = await fetch('https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js');
                        if (!response.ok) throw new Error('获取jsPDF库失败');
                        
                        const jsPDFCode = await response.text();
                        
                        // 将jsPDF代码注入到iframe中
                        const jsPDFScript = iframeDocument.createElement('script');
                        jsPDFScript.textContent = jsPDFCode;
                        iframeDocument.head.appendChild(jsPDFScript);
                        
                        // 等待脚本执行
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } catch (error) {
                        console.error('内联加载jsPDF失败:', error);
                        throw error;
                    }
                }
            }
            
            // 添加下载功能脚本
            const downloadFunctionsCode = `
            // 下载按钮点击处理函数
            window.handleDownloadButtonClick = function(e) {
                e.preventDefault();
                
                // 显示格式选择对话框
                showFormatSelectionDialog();
            };
            
            // 显示格式选择对话框
            function showFormatSelectionDialog() {
                // 创建对话框元素
                const dialog = document.createElement('div');
                dialog.className = 'format-selection-dialog';
                dialog.style.position = 'fixed';
                dialog.style.top = '50%';
                dialog.style.left = '50%';
                dialog.style.transform = 'translate(-50%, -50%)';
                dialog.style.backgroundColor = '#ffffff';
                dialog.style.padding = '20px';
                dialog.style.borderRadius = '8px';
                dialog.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
                dialog.style.zIndex = '1000';
                dialog.style.minWidth = '300px';
                dialog.style.textAlign = 'center';
                
                // 添加标题
                const title = document.createElement('h3');
                title.textContent = '选择下载格式';
                title.style.marginBottom = '20px';
                title.style.color = '#333333';
                dialog.appendChild(title);
                
                // 添加PDF按钮
                const pdfButton = document.createElement('button');
                pdfButton.textContent = 'PDF格式';
                pdfButton.className = 'btn btn-primary';
                pdfButton.style.marginRight = '10px';
                pdfButton.style.backgroundColor = '#FF7900';
                pdfButton.style.color = '#ffffff';
                pdfButton.style.border = 'none';
                pdfButton.style.padding = '10px 20px';
                pdfButton.style.borderRadius = '4px';
                pdfButton.style.cursor = 'pointer';
                pdfButton.addEventListener('click', function() {
                    dialog.remove();
                    overlay.remove();
                    generatePDF();
                });
                dialog.appendChild(pdfButton);
                
                // 添加图片按钮
                const imageButton = document.createElement('button');
                imageButton.textContent = '图片格式';
                imageButton.className = 'btn';
                imageButton.style.backgroundColor = '#f4f6f8';
                imageButton.style.color = '#333333';
                imageButton.style.border = '1px solid #e0e0e0';
                imageButton.style.padding = '10px 20px';
                imageButton.style.borderRadius = '4px';
                imageButton.style.cursor = 'pointer';
                imageButton.addEventListener('click', function() {
                    dialog.remove();
                    overlay.remove();
                    generateImage();
                });
                dialog.appendChild(imageButton);
                
                // 添加取消按钮
                const cancelButton = document.createElement('button');
                cancelButton.textContent = '取消';
                cancelButton.style.display = 'block';
                cancelButton.style.margin = '15px auto 0';
                cancelButton.style.backgroundColor = 'transparent';
                cancelButton.style.color = '#666666';
                cancelButton.style.border = 'none';
                cancelButton.style.padding = '5px 10px';
                cancelButton.style.cursor = 'pointer';
                cancelButton.style.fontSize = '0.9em';
                cancelButton.addEventListener('click', function() {
                    dialog.remove();
                    overlay.remove();
                });
                dialog.appendChild(cancelButton);
                
                // 添加背景遮罩
                const overlay = document.createElement('div');
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                overlay.style.zIndex = '999';
                overlay.addEventListener('click', function() {
                    overlay.remove();
                    dialog.remove();
                });
                
                // 将对话框和遮罩添加到文档
                document.body.appendChild(overlay);
                document.body.appendChild(dialog);
            }
            
            // 生成PDF报告
            async function generatePDF() {
                try {
                    // 显示加载指示器
                    const loadingIndicator = showLoadingIndicator('正在生成PDF...');
                    
                    console.log('Attempting to use jsPDF. window.jspdf is:', window.jspdf);
                    
                    // 创建一个包含所有需要的结果区域的容器
                    const reportContainer = document.createElement('div');
                    reportContainer.style.backgroundColor = '#ffffff';
                    reportContainer.style.padding = '20px';
                    reportContainer.style.position = 'absolute';
                    reportContainer.style.left = '-9999px';
                    reportContainer.style.top = '-9999px';
                    document.body.appendChild(reportContainer);
                    
                    // 获取要捕获的元素
                    const summarySection = document.getElementById('solution-summary-metrics');
                    const configSection = document.getElementById('configuration-details');
                    
                    if (!summarySection) {
                        hideLoadingIndicator(loadingIndicator);
                        document.body.removeChild(reportContainer);
                        alert('未找到报告内容，请先计算方案');
                        return;
                    }
                    
                    // 克隆元素到临时容器
                    reportContainer.appendChild(summarySection.cloneNode(true));
                    if (configSection) {
                        reportContainer.appendChild(configSection.cloneNode(true));
                    }
                    
                    // 添加PDF捕获准备类
                    reportContainer.classList.add('prepare-for-pdf-capture');
                    
                    // 处理SVG图表，确保正确渲染
                    const mermaidDiagrams = reportContainer.querySelectorAll('.mermaid');
                    mermaidDiagrams.forEach(diagram => {
                        const svg = diagram.querySelector('svg');
                        if (svg) {
                            // 确保SVG有明确的尺寸
                            const originalDiagram = document.getElementById(diagram.id);
                            if (originalDiagram) {
                                const rect = originalDiagram.getBoundingClientRect();
                                svg.setAttribute('width', rect.width);
                                svg.setAttribute('height', rect.height);
                                svg.style.width = rect.width + 'px';
                                svg.style.height = rect.height + 'px';
                                
                                // 确保所有子元素都可见
                                const allSvgElements = svg.querySelectorAll('*');
                                allSvgElements.forEach(el => {
                                    if (el.style) {
                                        el.style.visibility = 'visible';
                                        el.style.display = 'block';
                                    }
                                });
                            }
                        }
                    });
                    
                    // 使用html2canvas捕获元素
                    const canvas = await html2canvas(reportContainer, {
                        scale: 2, // 提高分辨率
                        useCORS: true, // 允许跨域图片
                        logging: false, // 关闭日志
                        allowTaint: true, // 允许污染画布
                        backgroundColor: '#ffffff', // 设置白色背景
                        onclone: (clonedDoc) => {
                            // 确保克隆文档中的SVG元素正确渲染
                            const diagrams = clonedDoc.querySelectorAll('.mermaid');
                            diagrams.forEach((diag) => {
                                const svg = diag.querySelector('svg');
                                if (svg) {
                                    // 确保SVG有明确的尺寸
                                    const actualDiag = document.getElementById(diag.id);
                                    if (actualDiag) {
                                        const rect = actualDiag.getBoundingClientRect();
                                        svg.setAttribute('width', rect.width);
                                        svg.setAttribute('height', rect.height);
                                        svg.style.width = rect.width + 'px';
                                        svg.style.height = rect.height + 'px';
                                    }
                                    
                                    // 确保所有子元素都可见
                                    const allSvgElements = svg.querySelectorAll('*');
                                    allSvgElements.forEach(el => {
                                        if (el.style) {
                                            el.style.visibility = 'visible';
                                            el.style.display = 'block';
                                        }
                                    });
                                }
                            });
                        }
                    });
                    
                    // 移除临时容器
                    document.body.removeChild(reportContainer);
                    
                    // 检查jsPDF是否可用
                    if (!window.jspdf) {
                        throw new Error('jsPDF库未正确加载');
                    }
                    
                    // 创建PDF文档 - 使用简化方法避免API兼容性问题
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a4'
                    });
                    
                    // 计算PDF尺寸
                    const imgWidth = 210; // A4宽度，单位mm
                    const pageHeight = 297; // A4高度，单位mm
                    const imgHeight = canvas.height * imgWidth / canvas.width;
                    
                    // 添加标题
                    pdf.setFontSize(18);
                    pdf.text('储能系统方案配置报告', 105, 20, { align: 'center' });
                    
                    // 添加生成日期
                    pdf.setFontSize(10);
                    const date = new Date();
                    pdf.text(\`生成日期: \${date.getFullYear()}-\${date.getMonth()+1}-\${date.getDate()}\`, 105, 30, { align: 'center' });
                    
                    // 将canvas转换为图像数据
                    const imgData = canvas.toDataURL('image/jpeg', 1.0);
                    
                    // 添加图像 - 使用简化方法
                    pdf.addImage(imgData, 'JPEG', 0, 40, imgWidth, imgHeight);
                    
                    // 保存PDF
                    pdf.save('储能系统方案配置报告.pdf');
                    
                    // 隐藏加载指示器
                    hideLoadingIndicator(loadingIndicator);
                    
                } catch (error) {
                    console.error('PDF生成失败:', error);
                    alert('生成PDF时出错: ' + error.message + '\\n将自动尝试图片下载');
                    
                    // 确保加载指示器被移除
                    const loadingIndicator = document.querySelector('.loading-indicator');
                    if (loadingIndicator) {
                        loadingIndicator.remove();
                    }
                    
                    // 移除遮罩
                    const overlay = document.querySelector('.loading-overlay');
                    if (overlay) {
                        overlay.remove();
                    }
                    
                    // 降级到图片下载
                    generateImage();
                }
            }
            
            // 生成图片报告
            async function generateImage() {
                try {
                    // 显示加载指示器
                    const loadingIndicator = showLoadingIndicator('正在生成图片...');
                    
                    // 创建一个包含所有需要的结果区域的容器
                    const reportContainer = document.createElement('div');
                    reportContainer.style.backgroundColor = '#ffffff';
                    reportContainer.style.padding = '20px';
                    reportContainer.style.position = 'absolute';
                    reportContainer.style.left = '-9999px';
                    reportContainer.style.top = '-9999px';
                    document.body.appendChild(reportContainer);
                    
                    // 获取要捕获的元素
                    const summarySection = document.getElementById('solution-summary-metrics');
                    const configSection = document.getElementById('configuration-details');
                    
                    if (!summarySection) {
                        hideLoadingIndicator(loadingIndicator);
                        document.body.removeChild(reportContainer);
                        alert('未找到报告内容，请先计算方案');
                        return;
                    }
                    
                    // 克隆元素到临时容器
                    reportContainer.appendChild(summarySection.cloneNode(true));
                    if (configSection) {
                        reportContainer.appendChild(configSection.cloneNode(true));
                    }
                    
                    // 添加PDF捕获准备类（同样适用于图片捕获）
                    reportContainer.classList.add('prepare-for-pdf-capture');
                    
                    // 处理SVG图表，确保正确渲染
                    const mermaidDiagrams = reportContainer.querySelectorAll('.mermaid');
                    mermaidDiagrams.forEach(diagram => {
                        const svg = diagram.querySelector('svg');
                        if (svg) {
                            // 确保SVG有明确的尺寸
                            const originalDiagram = document.getElementById(diagram.id);
                            if (originalDiagram) {
                                const rect = originalDiagram.getBoundingClientRect();
                                svg.setAttribute('width', rect.width);
                                svg.setAttribute('height', rect.height);
                                svg.style.width = rect.width + 'px';
                                svg.style.height = rect.height + 'px';
                                
                                // 确保所有子元素都可见
                                const allSvgElements = svg.querySelectorAll('*');
                                allSvgElements.forEach(el => {
                                    if (el.style) {
                                        el.style.visibility = 'visible';
                                        el.style.display = 'block';
                                    }
                                });
                            }
                        }
                    });
                    
                    // 使用html2canvas捕获元素
                    const canvas = await html2canvas(reportContainer, {
                        scale: 2, // 提高分辨率
                        useCORS: true, // 允许跨域图片
                        logging: false, // 关闭日志
                        allowTaint: true, // 允许污染画布
                        backgroundColor: '#ffffff', // 设置白色背景
                        onclone: (clonedDoc) => {
                            // 确保克隆文档中的SVG元素正确渲染
                            const diagrams = clonedDoc.querySelectorAll('.mermaid');
                            diagrams.forEach((diag) => {
                                const svg = diag.querySelector('svg');
                                if (svg) {
                                    // 确保SVG有明确的尺寸
                                    const actualDiag = document.getElementById(diag.id);
                                    if (actualDiag) {
                                        const rect = actualDiag.getBoundingClientRect();
                                        svg.setAttribute('width', rect.width);
                                        svg.setAttribute('height', rect.height);
                                        svg.style.width = rect.width + 'px';
                                        svg.style.height = rect.height + 'px';
                                    }
                                    
                                    // 确保所有子元素都可见
                                    const allSvgElements = svg.querySelectorAll('*');
                                    allSvgElements.forEach(el => {
                                        if (el.style) {
                                            el.style.visibility = 'visible';
                                            el.style.display = 'block';
                                        }
                                    });
                                }
                            });
                        }
                    });
                    
                    // 移除临时容器
                    document.body.removeChild(reportContainer);
                    
                    // 创建下载链接
                    const link = document.createElement('a');
                    link.download = '储能系统方案配置报告.png';
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    
                    // 隐藏加载指示器
                    hideLoadingIndicator(loadingIndicator);
                    
                } catch (error) {
                    console.error('生成图片时出错:', error);
                    alert('生成图片时出错: ' + error.message);
                    
                    // 确保加载指示器被移除
                    const loadingIndicator = document.querySelector('.loading-indicator');
                    if (loadingIndicator) {
                        loadingIndicator.remove();
                    }
                    
                    // 移除遮罩
                    const overlay = document.querySelector('.loading-overlay');
                    if (overlay) {
                        overlay.remove();
                    }
                }
            }
            
            // 显示加载指示器
            function showLoadingIndicator(message) {
                const loadingIndicator = document.createElement('div');
                loadingIndicator.className = 'loading-indicator';
                loadingIndicator.style.position = 'fixed';
                loadingIndicator.style.top = '50%';
                loadingIndicator.style.left = '50%';
                loadingIndicator.style.transform = 'translate(-50%, -50%)';
                loadingIndicator.style.backgroundColor = '#ffffff';
                loadingIndicator.style.padding = '20px';
                loadingIndicator.style.borderRadius = '8px';
                loadingIndicator.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
                loadingIndicator.style.zIndex = '1000';
                loadingIndicator.style.textAlign = 'center';
                
                const spinner = document.createElement('div');
                spinner.className = 'spinner';
                spinner.style.display = 'inline-block';
                spinner.style.border = '3px solid #f3f3f3';
                spinner.style.borderTop = '3px solid #FF7900';
                spinner.style.borderRadius = '50%';
                spinner.style.width = '30px';
                spinner.style.height = '30px';
                spinner.style.animation = 'spin 1s linear infinite';
                spinner.style.marginBottom = '15px';
                
                // 添加关键帧动画
                if (!document.getElementById('spinner-animation')) {
                    const style = document.createElement('style');
                    style.id = 'spinner-animation';
                    style.textContent = \`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    \`;
                    document.head.appendChild(style);
                }
                
                const text = document.createElement('div');
                text.textContent = message;
                text.style.marginTop = '10px';
                
                loadingIndicator.appendChild(spinner);
                loadingIndicator.appendChild(text);
                
                // 添加背景遮罩
                const overlay = document.createElement('div');
                overlay.className = 'loading-overlay';
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                overlay.style.zIndex = '999';
                
                document.body.appendChild(overlay);
                document.body.appendChild(loadingIndicator);
                
                return loadingIndicator;
            }
            
            // 隐藏加载指示器
            function hideLoadingIndicator(loadingIndicator) {
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
                
                const overlay = document.querySelector('.loading-overlay');
                if (overlay) {
                    overlay.remove();
                }
            }
            `;
            
            // 将下载功能脚本注入到iframe中
            const downloadScript = iframeDocument.createElement('script');
            downloadScript.textContent = downloadFunctionsCode;
            iframeDocument.head.appendChild(downloadScript);
            
            // 等待脚本执行
            await new Promise(resolve => setTimeout(resolve, 300));
            
            resolve();
        } catch (error) {
            console.error('预加载库失败:', error);
            reject(error);
        }
    });
}

/**
 * 将脚本加载到iframe中
 * @param {HTMLIFrameElement} iframe - iframe元素
 * @param {string} scriptUrl - 脚本URL
 * @returns {Promise} - 脚本加载完成的Promise
 */
function loadScriptToIframe(iframe, scriptUrl) {
    return new Promise((resolve, reject) => {
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
        const script = iframeDocument.createElement('script');
        script.src = scriptUrl;
        script.onload = resolve;
        script.onerror = reject;
        iframeDocument.head.appendChild(script);
    });
}

/**
 * 初始化下载按钮功能
 */
function initDownloadButton() {
    try {
        const iframe = document.getElementById('main-content');
        const iframeWindow = iframe.contentWindow;
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
        
        // 获取下载按钮
        const downloadButton = iframeDocument.getElementById('download-report-button');
        
        if (downloadButton) {
            // 添加点击事件处理
            downloadButton.addEventListener('click', function(e) {
                if (typeof iframeWindow.handleDownloadButtonClick === 'function') {
                    iframeWindow.handleDownloadButtonClick(e);
                } else {
                    console.error('下载处理函数未定义');
                    alert('下载功能初始化失败，请刷新页面重试');
                }
            });
            console.log('下载按钮功能已初始化');
        } else {
            console.error('未找到下载按钮元素');
        }
    } catch (error) {
        console.error('初始化下载按钮失败:', error);
    }
}
