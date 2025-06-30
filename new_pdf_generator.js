/**
 * 全新的PDF生成逻辑 - 本地依赖版
 * 
 * 此脚本在顶层页面实现完整的PDF生成功能
 * 使用本地依赖库，不依赖外部CDN
 * 精确选择需要捕获的内容，完全跳过项目参数输入部分
 * 对储能单元块图表进行特殊处理，确保结构清晰
 * 优化配置详情和储能单元块构成的格式和可读性
 */

(function() {
    console.log("正在初始化新的PDF生成逻辑 V11 (本地依赖版, 移除方案说明, 优化图片导出, 修复指标显示, 添加项目体量)...");
    
    // 等待DOM完全加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNewPDFGenerator);
    } else {
        initNewPDFGenerator();
    }
    
    /**
     * 初始化新的PDF生成器
     */
    function initNewPDFGenerator() {
        try {
            // 加载必要的库
            loadRequiredLibraries()
                .then(() => {
                    console.log('新的PDF生成逻辑初始化完成');
                    
                    // 暴露处理函数给全局作用域
                    window.handleNewPDFDownload = handleNewPDFDownload;
                })
                .catch(error => {
                    console.error('加载必要库失败:', error);
                });
        } catch (error) {
            console.error('初始化新的PDF生成器时出错:', error);
        }
    }
    
    /**
     * 加载必要的库
     * @returns {Promise} - 所有库加载完成的Promise
     */
    function loadRequiredLibraries() {
        return new Promise(async (resolve, reject) => {
            try {
                // 加载jsPDF库 - 优先使用本地版本
                if (!window.jspdf) {
                    try {
                        console.log('尝试加载本地jsPDF库...');
                        await loadScript('./libs/jspdf.umd.min.js');
                        
                        // 检查是否加载成功
                        if (!window.jspdf) {
                            console.log('本地jsPDF库加载失败，尝试备用CDN');
                            await loadScript('https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js');
                        } else {
                            console.log('本地jsPDF库加载成功');
                        }
                        
                        // 再次检查
                        if (!window.jspdf) {
                            throw new Error('无法加载jsPDF库');
                        }
                    } catch (error) {
                        console.error('jsPDF库加载失败:', error);
                        reject(error);
                        return;
                    }
                }
                
                // 加载html2canvas库 - 优先使用本地版本
                if (!window.html2canvas) {
                    try {
                        console.log('尝试加载本地html2canvas库...');
                        await loadScript('./libs/html2canvas.min.js');
                        
                        // 检查是否加载成功
                        if (!window.html2canvas) {
                            console.log('本地html2canvas库加载失败，尝试备用CDN');
                            await loadScript('https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js');
                        } else {
                            console.log('本地html2canvas库加载成功');
                        }
                        
                        // 再次检查
                        if (!window.html2canvas) {
                            throw new Error('无法加载html2canvas库');
                        }
                    } catch (error) {
                        console.error('html2canvas库加载失败:', error);
                        reject(error);
                        return;
                    }
                }
                
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * 加载脚本
     * @param {string} url - 脚本URL
     * @returns {Promise} - 脚本加载完成的Promise
     */
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = (e) => {
                console.error(`脚本加载失败: ${url}`, e);
                reject(new Error(`脚本加载失败: ${url}`));
            };
            document.head.appendChild(script);
        });
    }
    
    /**
     * 处理新的PDF下载
     */
    function handleNewPDFDownload() {
        console.log('新的PDF下载处理函数被调用');
        
        // 检查依赖是否已加载
        if (!window.jspdf || !window.html2canvas) {
            console.error('依赖库未加载，尝试重新加载');
            
            // 显示加载中提示
            const loadingIndicator = showLoadingIndicator('正在加载必要组件...');
            
            // 重新加载依赖
            loadRequiredLibraries()
                .then(() => {
                    hideLoadingIndicator(loadingIndicator);
                    showFormatSelectionDialog();
                })
                .catch(error => {
                    hideLoadingIndicator(loadingIndicator);
                    alert('加载必要组件失败，请稍后再试: ' + error.message);
                });
        } else {
            // 显示格式选择对话框
            showFormatSelectionDialog();
        }
    }
    
    /**
     * 显示格式选择对话框
     */
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
    
    /**
     * 显示加载指示器
     * @param {string} message - 显示的消息
     * @returns {Object} - 加载指示器元素和遮罩
     */
    function showLoadingIndicator(message) {
        // 创建遮罩
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '9999';
        
        // 创建加载指示器
        const indicator = document.createElement('div');
        indicator.className = 'loading-indicator';
        indicator.style.position = 'fixed';
        indicator.style.top = '50%';
        indicator.style.left = '50%';
        indicator.style.transform = 'translate(-50%, -50%)';
        indicator.style.backgroundColor = '#ffffff';
        indicator.style.padding = '20px';
        indicator.style.borderRadius = '8px';
        indicator.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
        indicator.style.zIndex = '10000';
        indicator.style.textAlign = 'center';
        
        // 添加加载动画
        const spinner = document.createElement('div');
        spinner.style.border = '4px solid #f3f3f3';
        spinner.style.borderTop = '4px solid #FF7900';
        spinner.style.borderRadius = '50%';
        spinner.style.width = '30px';
        spinner.style.height = '30px';
        spinner.style.animation = 'spin 1s linear infinite';
        spinner.style.margin = '0 auto 10px';
        
        // 添加@keyframes规则
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        // 添加消息
        const messageElement = document.createElement('div');
        messageElement.textContent = message || '加载中...';
        messageElement.style.color = '#333333';
        
        // 组装加载指示器
        indicator.appendChild(spinner);
        indicator.appendChild(messageElement);
        
        // 添加到文档
        document.body.appendChild(overlay);
        document.body.appendChild(indicator);
        
        return {
            overlay: overlay,
            indicator: indicator
        };
    }
    
    /**
     * 隐藏加载指示器
     * @param {Object} loadingIndicator - 加载指示器对象
     */
    function hideLoadingIndicator(loadingIndicator) {
        if (loadingIndicator) {
            if (loadingIndicator.overlay) {
                loadingIndicator.overlay.remove();
            }
            if (loadingIndicator.indicator) {
                loadingIndicator.indicator.remove();
            }
        } else {
            // 尝试通过类名查找
            const indicator = document.querySelector('.loading-indicator');
            if (indicator) {
                indicator.remove();
            }
            
            const overlay = document.querySelector('.loading-overlay');
            if (overlay) {
                overlay.remove();
            }
        }
    }
    
    /**
     * 等待iframe内容完全加载
     * @param {HTMLIFrameElement} iframe - iframe元素
     * @returns {Promise} - 内容加载完成的Promise
     */
    function waitForIframeContent(iframe) {
        return new Promise((resolve) => {
            // 如果iframe已经加载完成
            if (iframe.contentDocument && 
                iframe.contentDocument.readyState === 'complete') {
                console.log('iframe内容已加载完成');
                resolve();
                return;
            }
            
            console.log('等待iframe内容加载...');
            
            // 设置轮询检查
            const checkInterval = setInterval(() => {
                if (iframe.contentDocument && 
                    iframe.contentDocument.readyState === 'complete') {
                    clearInterval(checkInterval);
                    console.log('iframe内容加载完成');
                    
                    // 额外等待500ms确保动态内容渲染完成
                    setTimeout(() => {
                        resolve();
                    }, 500);
                }
            }, 100);
            
            // 设置超时
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('iframe内容加载超时，继续执行');
                resolve();
            }, 5000);
        });
    }
    
    /**
     * 获取项目体量信息
     * @param {Document} iframeDocument - iframe文档对象
     * @returns {string} - 项目体量字符串，例如 "50MW/100MWh"
     */
    function getProjectCapacity(iframeDocument) {
        try {
            // 尝试获取用户输入的功率和容量
            let powerValue = '';
            let energyValue = '';
            
            // 方法1：从方案核心指标中获取
            const summarySection = iframeDocument.getElementById('solution-summary-metrics');
            if (summarySection) {
                const metricCards = summarySection.querySelectorAll('.metric-card');
                metricCards.forEach(card => {
                    const label = card.querySelector('.metric-label');
                    const value = card.querySelector('.metric-value');
                    const unit = card.querySelector('.metric-unit');
                    
                    if (label && value && unit) {
                        const labelText = label.textContent.trim();
                        const valueText = value.textContent.trim();
                        const unitText = unit.textContent.trim();
                        
                        if (labelText.includes('输入功率')) {
                            powerValue = valueText + unitText;
                        } else if (labelText.includes('输入容量')) {
                            energyValue = valueText + unitText;
                        }
                    }
                });
            }
            
            // 方法2：从结果提示中获取
            if (!powerValue || !energyValue) {
                const resultTip = iframeDocument.querySelector('.result-tip');
                if (resultTip) {
                    const tipText = resultTip.textContent;
                    const match = tipText.match(/(\d+(\.\d+)?)\s*MW/);
                    if (match) {
                        powerValue = match[1] + 'MW';
                    }
                }
            }
            
            // 方法3：从输入表单中获取
            if (!powerValue || !energyValue) {
                const powerInput = iframeDocument.getElementById('power-input');
                const energyInput = iframeDocument.getElementById('energy-input');
                
                if (powerInput && powerInput.value) {
                    powerValue = powerInput.value + 'MW';
                }
                
                if (energyInput && energyInput.value) {
                    energyValue = energyInput.value + 'MWh';
                }
            }
            
            // 组合项目体量字符串
            if (powerValue && energyValue) {
                return powerValue + '/' + energyValue;
            } else if (powerValue) {
                return powerValue;
            } else if (energyValue) {
                return energyValue;
            }
            
            return '';
        } catch (error) {
            console.error('获取项目体量信息失败:', error);
            return '';
        }
    }
    
    /**
     * 格式化配置文本
     * @param {string} text - 原始文本
     * @returns {string} - 格式化后的HTML
     */
    function formatConfigText(text) {
        // 移除多余空格和换行
        let formatted = text.replace(/\s+/g, ' ').trim();
        
        // 替换常见分隔符为HTML格式
        formatted = formatted.replace(/([^:]+):\s*([^;]+)(;|$)/g, '<strong>$1:</strong> $2<br>');
        
        // 处理可能的列表项
        formatted = formatted.replace(/•\s*([^•]+)/g, '• $1<br>');
        
        return formatted;
    }
    
    /**
     * 格式化储能单元块详细构成
     * @param {string} text - 原始文本
     * @returns {string} - 格式化后的HTML
     */
    function formatEssBlocksDetail(text) {
        // 移除多余空格和换行
        let formatted = text.replace(/\s+/g, ' ').trim();
        
        // 替换常见分隔符为HTML格式
        formatted = formatted.replace(/([^:]+):\s*([^;]+)(;|$)/g, '<p><strong>$1:</strong> $2</p>');
        
        // 处理可能的列表项
        formatted = formatted.replace(/•\s*([^•]+)/g, '<p>• $1</p>');
        
        return formatted;
    }
    
    /**
     * 生成PDF报告 - 使用分块渲染方式
     */
    async function generatePDF() {
        try {
            // 再次检查依赖是否已加载
            if (!window.jspdf || !window.html2canvas) {
                throw new Error('依赖库未加载，无法生成PDF');
            }
            
            // 显示加载指示器
            const loadingIndicator = showLoadingIndicator('正在生成PDF...');
            
            // 获取iframe元素
            const iframe = document.getElementById('main-content');
            
            // 等待iframe内容完全加载
            await waitForIframeContent(iframe);
            
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            
            // 获取项目体量信息
            const projectCapacity = getProjectCapacity(iframeDocument);
            
            // 创建PDF文档
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // 定义A4页面尺寸（单位：mm）
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 10; // 页边距
            const contentWidth = pageWidth - 2 * margin;
            
            // 当前Y坐标位置
            let yPosition = margin;
            let currentPage = 1;
            
            // 添加标题
            const titleContainer = document.createElement('div');
            titleContainer.style.width = '800px';
            titleContainer.style.textAlign = 'center';
            titleContainer.style.padding = '0';
            titleContainer.style.margin = '0';
            
            const title = document.createElement('h1');
            // 添加项目体量到标题
            title.textContent = projectCapacity 
                ? `${projectCapacity} 储能系统方案配置报告` 
                : '储能系统方案配置报告';
            title.style.fontSize = '24px';
            title.style.fontWeight = 'bold';
            title.style.margin = '0 0 5px 0';
            title.style.padding = '0';
            title.style.color = '#333333';
            title.style.fontFamily = '"Noto Sans SC", sans-serif';
            titleContainer.appendChild(title);
            
            // 添加生成日期
            const dateInfo = document.createElement('p');
            const date = new Date();
            dateInfo.textContent = `生成日期: ${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            dateInfo.style.fontSize = '12px';
            dateInfo.style.margin = '0 0 10px 0';
            dateInfo.style.padding = '0';
            dateInfo.style.color = '#666666';
            dateInfo.style.fontFamily = '"Noto Sans SC", sans-serif';
            titleContainer.appendChild(dateInfo);
            
            document.body.appendChild(titleContainer);
            
            // 渲染标题
            const titleCanvas = await html2canvas(titleContainer, {
                scale: 2,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            document.body.removeChild(titleContainer);
            
            // 计算标题高度（mm）
            const titleHeight = (titleCanvas.height * contentWidth / titleCanvas.width);
            
            // 添加标题到PDF
            pdf.addImage(
                titleCanvas.toDataURL('image/jpeg', 1.0),
                'JPEG',
                margin,
                yPosition,
                contentWidth,
                titleHeight
            );
            
            // 更新Y坐标
            yPosition += titleHeight + 5;
            
            // 获取方案核心指标
            const summarySection = iframeDocument.getElementById('solution-summary-metrics');
            if (summarySection) {
                console.log('找到方案核心指标部分');
                
                // 创建指标容器 - 修改为表格布局以确保完整显示
                const metricsContainer = document.createElement('div');
                metricsContainer.style.width = '800px';
                metricsContainer.style.padding = '10px';
                metricsContainer.style.backgroundColor = '#f9f9f9';
                metricsContainer.style.borderRadius = '5px';
                metricsContainer.style.border = '1px solid #e0e0e0';
                
                // 创建表格布局
                const metricsTable = document.createElement('table');
                metricsTable.style.width = '100%';
                metricsTable.style.borderCollapse = 'separate';
                metricsTable.style.borderSpacing = '10px';
                metricsTable.style.margin = '0';
                metricsTable.style.padding = '0';
                
                // 创建表格行
                const metricsRow = document.createElement('tr');
                
                // 获取所有指标卡片
                const metricCards = summarySection.querySelectorAll('.metric-card');
                
                // 将每个指标卡片添加到表格中
                metricCards.forEach(card => {
                    // 创建表格单元格
                    const cell = document.createElement('td');
                    cell.style.width = (100 / metricCards.length) + '%';
                    cell.style.padding = '10px';
                    cell.style.backgroundColor = '#ffffff';
                    cell.style.border = '1px solid #e0e0e0';
                    cell.style.borderRadius = '4px';
                    cell.style.textAlign = 'center';
                    cell.style.verticalAlign = 'top';
                    
                    // 克隆卡片内容
                    const cardClone = card.cloneNode(true);
                    cardClone.style.boxShadow = 'none';
                    cardClone.style.border = 'none';
                    cardClone.style.margin = '0';
                    cardClone.style.padding = '0';
                    cardClone.style.backgroundColor = 'transparent';
                    
                    // 调整卡片内部元素样式
                    const labelElement = cardClone.querySelector('.metric-label');
                    if (labelElement) {
                        labelElement.style.fontSize = '16px';
                        labelElement.style.margin = '0 0 5px 0';
                        labelElement.style.padding = '0';
                        labelElement.style.color = '#333333';
                        labelElement.style.fontWeight = 'normal';
                        labelElement.style.display = 'block';
                    }
                    
                    const valueElement = cardClone.querySelector('.metric-value');
                    if (valueElement) {
                        valueElement.style.fontSize = '24px';
                        valueElement.style.fontWeight = 'bold';
                        valueElement.style.color = '#FF7900';
                        valueElement.style.margin = '5px 0';
                        valueElement.style.padding = '0';
                        valueElement.style.display = 'block';
                    }
                    
                    const unitElement = cardClone.querySelector('.metric-unit');
                    if (unitElement) {
                        unitElement.style.fontSize = '14px';
                        unitElement.style.color = '#666666';
                        unitElement.style.margin = '0';
                        unitElement.style.padding = '0';
                        unitElement.style.display = 'block';
                    }
                    
                    cell.appendChild(cardClone);
                    metricsRow.appendChild(cell);
                });
                
                metricsTable.appendChild(metricsRow);
                metricsContainer.appendChild(metricsTable);
                document.body.appendChild(metricsContainer);
                
                // 渲染指标部分
                const metricsCanvas = await html2canvas(metricsContainer, {
                    scale: 2,
                    logging: false,
                    backgroundColor: '#ffffff'
                });
                
                document.body.removeChild(metricsContainer);
                
                // 检查是否需要新页面
                const metricsHeight = (metricsCanvas.height * contentWidth / metricsCanvas.width);
                if (yPosition + metricsHeight > pageHeight - margin) {
                    pdf.addPage();
                    yPosition = margin;
                    currentPage++;
                }
                
                // 添加指标到PDF
                pdf.addImage(
                    metricsCanvas.toDataURL('image/jpeg', 1.0),
                    'JPEG',
                    margin,
                    yPosition,
                    contentWidth,
                    metricsHeight
                );
                
                // 更新Y坐标
                yPosition += metricsHeight + 10;
            }
            
            // 添加配置详情部分
            const configDetails = iframeDocument.getElementById('configuration-details');
            if (configDetails) {
                console.log('找到配置详情部分');
                
                // 创建配置详情标题
                const configTitleContainer = document.createElement('div');
                configTitleContainer.style.width = '800px';
                configTitleContainer.style.padding = '0';
                configTitleContainer.style.margin = '0';
                
                const configTitle = document.createElement('h2');
                configTitle.textContent = '配置详情';
                configTitle.style.fontSize = '20px';
                configTitle.style.fontWeight = 'bold';
                configTitle.style.margin = '0 0 5px 0';
                configTitle.style.padding = '0 0 5px 0';
                configTitle.style.borderBottom = '2px solid #FF7900';
                configTitle.style.color = '#333333';
                configTitle.style.fontFamily = '"Noto Sans SC", sans-serif';
                configTitleContainer.appendChild(configTitle);
                
                document.body.appendChild(configTitleContainer);
                
                // 渲染配置标题
                const configTitleCanvas = await html2canvas(configTitleContainer, {
                    scale: 2,
                    logging: false,
                    backgroundColor: '#ffffff'
                });
                
                document.body.removeChild(configTitleContainer);
                
                // 检查是否需要新页面
                const configTitleHeight = (configTitleCanvas.height * contentWidth / configTitleCanvas.width);
                if (yPosition + configTitleHeight > pageHeight - margin) {
                    pdf.addPage();
                    yPosition = margin;
                    currentPage++;
                }
                
                // 添加配置标题到PDF
                pdf.addImage(
                    configTitleCanvas.toDataURL('image/jpeg', 1.0),
                    'JPEG',
                    margin,
                    yPosition,
                    contentWidth,
                    configTitleHeight
                );
                
                // 更新Y坐标
                yPosition += configTitleHeight + 5;
                
                // 处理交流侧配置
                const acSideContainer = configDetails.querySelector('#ac-side-container');
                if (acSideContainer && acSideContainer.style.display !== 'none') {
                    console.log('找到交流侧容器');
                    
                    // 创建交流侧表格
                    const acTableContainer = document.createElement('div');
                    acTableContainer.style.width = '800px';
                    acTableContainer.style.marginBottom = '10px';
                    
                    const acTable = document.createElement('table');
                    acTable.style.width = '100%';
                    acTable.style.borderCollapse = 'collapse';
                    acTable.style.border = '1px solid #e0e0e0';
                    
                    const acRow = document.createElement('tr');
                    acRow.style.backgroundColor = '#f5f5f5';
                    
                    const acTitleCell = document.createElement('td');
                    acTitleCell.textContent = '交流侧配置';
                    acTitleCell.style.padding = '10px';
                    acTitleCell.style.fontWeight = 'bold';
                    acTitleCell.style.width = '20%';
                    acTitleCell.style.borderRight = '1px solid #e0e0e0';
                    acRow.appendChild(acTitleCell);
                    
                    const acContentCell = document.createElement('td');
                    acContentCell.style.padding = '10px';
                    
                    // 获取交流侧列表
                    const acSideList = acSideContainer.querySelector('#ac-side-list');
                    if (acSideList) {
                        const acSideListClone = acSideList.cloneNode(true);
                        acContentCell.appendChild(acSideListClone);
                    } else {
                        const acText = acSideContainer.textContent.trim();
                        const formattedAcText = formatConfigText(acText);
                        acContentCell.innerHTML = formattedAcText;
                    }
                    
                    acRow.appendChild(acContentCell);
                    acTable.appendChild(acRow);
                    acTableContainer.appendChild(acTable);
                    
                    document.body.appendChild(acTableContainer);
                    
                    // 渲染交流侧配置
                    const acTableCanvas = await html2canvas(acTableContainer, {
                        scale: 2,
                        logging: false,
                        backgroundColor: '#ffffff'
                    });
                    
                    document.body.removeChild(acTableContainer);
                    
                    // 检查是否需要新页面
                    const acTableHeight = (acTableCanvas.height * contentWidth / acTableCanvas.width);
                    if (yPosition + acTableHeight > pageHeight - margin) {
                        pdf.addPage();
                        yPosition = margin;
                        currentPage++;
                    }
                    
                    // 添加交流侧配置到PDF
                    pdf.addImage(
                        acTableCanvas.toDataURL('image/jpeg', 1.0),
                        'JPEG',
                        margin,
                        yPosition,
                        contentWidth,
                        acTableHeight
                    );
                    
                    // 更新Y坐标
                    yPosition += acTableHeight + 5;
                }
                
                // 处理直流侧配置
                const dcSideContainer = configDetails.querySelector('#dc-side-container');
                if (dcSideContainer && dcSideContainer.style.display !== 'none') {
                    console.log('找到直流侧容器');
                    
                    // 创建直流侧表格
                    const dcTableContainer = document.createElement('div');
                    dcTableContainer.style.width = '800px';
                    dcTableContainer.style.marginBottom = '10px';
                    
                    const dcTable = document.createElement('table');
                    dcTable.style.width = '100%';
                    dcTable.style.borderCollapse = 'collapse';
                    dcTable.style.border = '1px solid #e0e0e0';
                    
                    const dcRow = document.createElement('tr');
                    
                    const dcTitleCell = document.createElement('td');
                    dcTitleCell.textContent = '直流侧配置';
                    dcTitleCell.style.padding = '10px';
                    dcTitleCell.style.fontWeight = 'bold';
                    dcTitleCell.style.width = '20%';
                    dcTitleCell.style.borderRight = '1px solid #e0e0e0';
                    dcRow.appendChild(dcTitleCell);
                    
                    const dcContentCell = document.createElement('td');
                    dcContentCell.style.padding = '10px';
                    
                    // 获取直流侧列表
                    const dcSideList = dcSideContainer.querySelector('#dc-side-list');
                    if (dcSideList) {
                        const dcSideListClone = dcSideList.cloneNode(true);
                        dcContentCell.appendChild(dcSideListClone);
                    } else {
                        const dcText = dcSideContainer.textContent.trim();
                        const formattedDcText = formatConfigText(dcText);
                        dcContentCell.innerHTML = formattedDcText;
                    }
                    
                    dcRow.appendChild(dcContentCell);
                    dcTable.appendChild(dcRow);
                    dcTableContainer.appendChild(dcTable);
                    
                    document.body.appendChild(dcTableContainer);
                    
                    // 渲染直流侧配置
                    const dcTableCanvas = await html2canvas(dcTableContainer, {
                        scale: 2,
                        logging: false,
                        backgroundColor: '#ffffff'
                    });
                    
                    document.body.removeChild(dcTableContainer);
                    
                    // 检查是否需要新页面
                    const dcTableHeight = (dcTableCanvas.height * contentWidth / dcTableCanvas.width);
                    if (yPosition + dcTableHeight > pageHeight - margin) {
                        pdf.addPage();
                        yPosition = margin;
                        currentPage++;
                    }
                    
                    // 添加直流侧配置到PDF
                    pdf.addImage(
                        dcTableCanvas.toDataURL('image/jpeg', 1.0),
                        'JPEG',
                        margin,
                        yPosition,
                        contentWidth,
                        dcTableHeight
                    );
                    
                    // 更新Y坐标
                    yPosition += dcTableHeight + 5;
                }
                
                // 处理储能单元块构成
                const essBlocksContainer = configDetails.querySelector('#ess-blocks-container');
                if (essBlocksContainer && essBlocksContainer.style.display !== 'none') {
                    console.log('找到储能单元块容器');
                    
                    // 创建储能单元块标题
                    const essBlocksTitleContainer = document.createElement('div');
                    essBlocksTitleContainer.style.width = '800px';
                    essBlocksTitleContainer.style.padding = '0';
                    essBlocksTitleContainer.style.margin = '10px 0 5px 0';
                    
                    const essBlocksTitle = document.createElement('h3');
                    essBlocksTitle.textContent = '储能单元块构成';
                    essBlocksTitle.style.fontSize = '18px';
                    essBlocksTitle.style.fontWeight = 'bold';
                    essBlocksTitle.style.margin = '0';
                    essBlocksTitle.style.padding = '0 0 5px 0';
                    essBlocksTitle.style.borderBottom = '1px solid #e0e0e0';
                    essBlocksTitle.style.color = '#333333';
                    essBlocksTitle.style.fontFamily = '"Noto Sans SC", sans-serif';
                    essBlocksTitleContainer.appendChild(essBlocksTitle);
                    
                    document.body.appendChild(essBlocksTitleContainer);
                    
                    // 渲染储能单元块标题
                    const essBlocksTitleCanvas = await html2canvas(essBlocksTitleContainer, {
                        scale: 2,
                        logging: false,
                        backgroundColor: '#ffffff'
                    });
                    
                    document.body.removeChild(essBlocksTitleContainer);
                    
                    // 检查是否需要新页面
                    const essBlocksTitleHeight = (essBlocksTitleCanvas.height * contentWidth / essBlocksTitleCanvas.width);
                    if (yPosition + essBlocksTitleHeight > pageHeight - margin) {
                        pdf.addPage();
                        yPosition = margin;
                        currentPage++;
                    }
                    
                    // 添加储能单元块标题到PDF
                    pdf.addImage(
                        essBlocksTitleCanvas.toDataURL('image/jpeg', 1.0),
                        'JPEG',
                        margin,
                        yPosition,
                        contentWidth,
                        essBlocksTitleHeight
                    );
                    
                    // 更新Y坐标
                    yPosition += essBlocksTitleHeight + 5;
                    
                    // 克隆储能单元块容器
                    const essBlocksClone = essBlocksContainer.cloneNode(true);
                    
                    // 创建储能单元块内容容器
                    const essBlocksContentContainer = document.createElement('div');
                    essBlocksContentContainer.style.width = '800px';
                    essBlocksContentContainer.style.padding = '15px';
                    essBlocksContentContainer.style.margin = '0';
                    essBlocksContentContainer.style.backgroundColor = '#f9f9f9';
                    essBlocksContentContainer.style.borderRadius = '5px';
                    essBlocksContentContainer.style.border = '1px solid #e0e0e0';
                    
                    // 确保容器可见
                    essBlocksClone.style.display = 'block';
                    
                    // 处理SVG图表
                    const mermaidDiagrams = essBlocksClone.querySelectorAll('.mermaid');
                    mermaidDiagrams.forEach(diagram => {
                        const svg = diagram.querySelector('svg');
                        if (svg) {
                            // 获取原始图表的尺寸
                            const originalDiagram = iframeDocument.getElementById(diagram.id);
                            if (originalDiagram) {
                                const rect = originalDiagram.getBoundingClientRect();
                                
                                // 设置明确的尺寸
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
                    
                    essBlocksContentContainer.appendChild(essBlocksClone);
                    document.body.appendChild(essBlocksContentContainer);
                    
                    // 渲染储能单元块内容
                    const essBlocksContentCanvas = await html2canvas(essBlocksContentContainer, {
                        scale: 2,
                        logging: false,
                        backgroundColor: '#ffffff'
                    });
                    
                    document.body.removeChild(essBlocksContentContainer);
                    
                    // 检查是否需要新页面
                    const essBlocksContentHeight = (essBlocksContentCanvas.height * contentWidth / essBlocksContentCanvas.width);
                    if (yPosition + essBlocksContentHeight > pageHeight - margin) {
                        pdf.addPage();
                        yPosition = margin;
                        currentPage++;
                    }
                    
                    // 添加储能单元块内容到PDF
                    pdf.addImage(
                        essBlocksContentCanvas.toDataURL('image/jpeg', 1.0),
                        'JPEG',
                        margin,
                        yPosition,
                        contentWidth,
                        essBlocksContentHeight
                    );
                    
                    // 更新Y坐标
                    yPosition += essBlocksContentHeight + 10;
                }
            } else {
                console.warn('未找到配置详情部分');
                
                // 创建错误提示
                const errorContainer = document.createElement('div');
                errorContainer.style.width = '800px';
                errorContainer.style.padding = '10px';
                errorContainer.style.margin = '10px 0';
                errorContainer.style.backgroundColor = '#fff0f0';
                errorContainer.style.borderRadius = '5px';
                errorContainer.style.border = '1px solid #ff0000';
                errorContainer.style.textAlign = 'center';
                
                const errorMessage = document.createElement('p');
                errorMessage.textContent = '配置详情不可用，请确保已生成配置结果。';
                errorMessage.style.color = '#ff0000';
                errorMessage.style.margin = '0';
                errorContainer.appendChild(errorMessage);
                
                document.body.appendChild(errorContainer);
                
                // 渲染错误提示
                const errorCanvas = await html2canvas(errorContainer, {
                    scale: 2,
                    logging: false,
                    backgroundColor: '#ffffff'
                });
                
                document.body.removeChild(errorContainer);
                
                // 检查是否需要新页面
                const errorHeight = (errorCanvas.height * contentWidth / errorCanvas.width);
                if (yPosition + errorHeight > pageHeight - margin) {
                    pdf.addPage();
                    yPosition = margin;
                    currentPage++;
                }
                
                // 添加错误提示到PDF
                pdf.addImage(
                    errorCanvas.toDataURL('image/jpeg', 1.0),
                    'JPEG',
                    margin,
                    yPosition,
                    contentWidth,
                    errorHeight
                );
                
                // 更新Y坐标
                yPosition += errorHeight + 10;
            }
            
            // **移除** 方案说明与选型部分
            // ... (代码已注释掉)
            
            // 添加页脚
            for (let i = 1; i <= currentPage; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.text(`第 ${i} 页，共 ${currentPage} 页`, pageWidth / 2, pageHeight - 5, { align: 'center' });
            }
            
            // 生成文件名（包含项目体量）
            const fileName = projectCapacity 
                ? `${projectCapacity.replace(/\//g, '_')}储能系统方案配置报告.pdf` 
                : '储能系统方案配置报告.pdf';
            
            // 保存PDF
            pdf.save(fileName);
            
            // 隐藏加载指示器
            hideLoadingIndicator(loadingIndicator);
            
        } catch (error) {
            console.error('PDF生成失败:', error);
            alert('生成PDF时出错: ' + error.message + '\n将自动尝试图片下载');
            
            // 确保加载指示器被移除
            hideLoadingIndicator();
            
            // 降级到图片下载
            generateImage();
        }
    }
    
    /**
     * 生成图片报告 - 优化布局还原
     */
    async function generateImage() {
        try {
            // 显示加载指示器
            const loadingIndicator = showLoadingIndicator('正在生成图片...');
            
            // 获取iframe元素
            const iframe = document.getElementById('main-content');
            
            // 等待iframe内容完全加载
            await waitForIframeContent(iframe);
            
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            const iframeWindow = iframe.contentWindow;
            
            // 获取项目体量信息
            const projectCapacity = getProjectCapacity(iframeDocument);
            
            // 获取需要捕获的结果区域
            const resultsArea = iframeDocument.getElementById('results-area');
            
            if (!resultsArea) {
                throw new Error('无法找到结果区域 (results-area)');
            }
            
            // --- 优化：直接捕获iframe内的元素，并传递样式 --- 
            console.log('开始使用优化后的图片生成逻辑...');
            
            // 准备要捕获的元素 (克隆以避免修改原始页面)
            const elementToCapture = resultsArea.cloneNode(true);
            elementToCapture.style.display = 'block'; // 确保可见
            elementToCapture.style.backgroundColor = '#ffffff'; // 设置背景色
            elementToCapture.style.padding = '20px'; // 添加内边距，模拟报告样式
            elementToCapture.style.margin = '0'; // 移除外边距
            elementToCapture.style.boxSizing = 'border-box'; // 确保padding包含在宽度内
            
            // 移除不需要的部分
            const downloadButton = elementToCapture.querySelector('#download-report-button');
            if (downloadButton) {
                downloadButton.remove();
            }
            const solutionParams = elementToCapture.querySelector('#solution-parameters');
            if (solutionParams) {
                solutionParams.remove();
            }
            
            // 确保所有部分可见
            const allSections = elementToCapture.querySelectorAll('section');
            allSections.forEach(section => {
                section.style.display = 'block';
            });
            
            // 处理SVG图表
            const mermaidDiagrams = elementToCapture.querySelectorAll('.mermaid');
            mermaidDiagrams.forEach(diagram => {
                const svg = diagram.querySelector('svg');
                if (svg) {
                    const originalDiagram = iframeDocument.getElementById(diagram.id);
                    if (originalDiagram) {
                        const rect = originalDiagram.getBoundingClientRect();
                        svg.setAttribute('width', rect.width);
                        svg.setAttribute('height', rect.height);
                        svg.style.width = rect.width + 'px';
                        svg.style.height = rect.height + 'px';
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
            
            // 创建一个临时容器，用于添加标题和日期，并容纳要捕获的元素
            const captureWrapper = document.createElement('div');
            captureWrapper.style.width = '1000px'; // 设置一个合理的宽度
            captureWrapper.style.backgroundColor = '#ffffff';
            captureWrapper.style.padding = '20px';
            captureWrapper.style.boxSizing = 'border-box';
            
            // 添加标题
            const title = document.createElement('h1');
            // 添加项目体量到标题
            title.textContent = projectCapacity 
                ? `${projectCapacity} 储能系统方案配置报告` 
                : '储能系统方案配置报告';
            title.style.textAlign = 'center';
            title.style.marginBottom = '10px';
            title.style.color = '#333333';
            title.style.fontFamily = iframeWindow.getComputedStyle(iframeDocument.body).fontFamily || '"Noto Sans SC", sans-serif';
            captureWrapper.appendChild(title);
            
            // 添加生成日期
            const dateInfo = document.createElement('p');
            const date = new Date();
            dateInfo.textContent = `生成日期: ${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            dateInfo.style.textAlign = 'center';
            dateInfo.style.marginBottom = '20px';
            dateInfo.style.color = '#666666';
            dateInfo.style.fontFamily = iframeWindow.getComputedStyle(iframeDocument.body).fontFamily || '"Noto Sans SC", sans-serif';
            captureWrapper.appendChild(dateInfo);
            
            // 优化方案核心指标显示
            const summarySection = elementToCapture.querySelector('#solution-summary-metrics');
            if (summarySection) {
                // 确保指标卡片水平排列且完全显示
                const metricCards = summarySection.querySelectorAll('.metric-card');
                if (metricCards.length > 0) {
                    // 创建表格布局容器
                    const metricsTable = document.createElement('div');
                    metricsTable.style.display = 'flex';
                    metricsTable.style.flexDirection = 'row';
                    metricsTable.style.justifyContent = 'space-between';
                    metricsTable.style.width = '100%';
                    metricsTable.style.marginBottom = '20px';
                    metricsTable.style.padding = '10px';
                    metricsTable.style.backgroundColor = '#f9f9f9';
                    metricsTable.style.borderRadius = '5px';
                    
                    // 将每个指标卡片添加到表格中
                    metricCards.forEach(card => {
                        const cardClone = card.cloneNode(true);
                        cardClone.style.flex = '1';
                        cardClone.style.margin = '0 5px';
                        cardClone.style.padding = '10px';
                        cardClone.style.backgroundColor = '#ffffff';
                        cardClone.style.border = '1px solid #e0e0e0';
                        cardClone.style.borderRadius = '4px';
                        cardClone.style.boxShadow = 'none';
                        cardClone.style.textAlign = 'center';
                        
                        // 调整卡片内部元素样式
                        const labelElement = cardClone.querySelector('.metric-label');
                        if (labelElement) {
                            labelElement.style.fontSize = '16px';
                            labelElement.style.margin = '0 0 5px 0';
                            labelElement.style.padding = '0';
                            labelElement.style.color = '#333333';
                            labelElement.style.fontWeight = 'normal';
                            labelElement.style.display = 'block';
                        }
                        
                        const valueElement = cardClone.querySelector('.metric-value');
                        if (valueElement) {
                            valueElement.style.fontSize = '24px';
                            valueElement.style.fontWeight = 'bold';
                            valueElement.style.color = '#FF7900';
                            valueElement.style.margin = '5px 0';
                            valueElement.style.padding = '0';
                            valueElement.style.display = 'block';
                        }
                        
                        const unitElement = cardClone.querySelector('.metric-unit');
                        if (unitElement) {
                            unitElement.style.fontSize = '14px';
                            unitElement.style.color = '#666666';
                            unitElement.style.margin = '0';
                            unitElement.style.padding = '0';
                            unitElement.style.display = 'block';
                        }
                        
                        metricsTable.appendChild(cardClone);
                    });
                    
                    // 替换原始指标部分
                    summarySection.innerHTML = '';
                    summarySection.appendChild(metricsTable);
                }
            }
            
            // 将准备好的元素添加到包装器中
            captureWrapper.appendChild(elementToCapture);
            
            // 将包装器添加到iframe的body中（临时）
            iframeDocument.body.appendChild(captureWrapper);
            
            // 使用html2canvas捕获包装器
            const canvas = await html2canvas(captureWrapper, {
                scale: 2, // 提高分辨率
                useCORS: true, // 允许跨域图片
                logging: false, // 关闭日志
                allowTaint: true, // 允许污染画布
                backgroundColor: '#ffffff', // 设置白色背景
                // 传递iframe的窗口尺寸，可能有助于布局计算
                windowWidth: iframeWindow.innerWidth,
                windowHeight: iframeWindow.innerHeight,
                scrollX: -iframeWindow.scrollX, // 考虑滚动位置
                scrollY: -iframeWindow.scrollY
            });
            
            // 从iframe中移除临时包装器
            iframeDocument.body.removeChild(captureWrapper);
            
            // 生成文件名（包含项目体量）
            const fileName = projectCapacity 
                ? `${projectCapacity.replace(/\//g, '_')}储能系统方案配置报告.png` 
                : '储能系统方案配置报告.png';
            
            // 创建下载链接
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            // 隐藏加载指示器
            hideLoadingIndicator(loadingIndicator);
            
        } catch (error) {
            console.error('图片生成失败:', error);
            alert('生成图片时出错: ' + error.message);
            
            // 确保加载指示器被移除
            hideLoadingIndicator();
        }
    }
})();
