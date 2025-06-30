/**
 * 动态加载器 - 最终版
 * 
 * 此脚本用于在不修改原始文件的情况下动态加载功能增强
 * 特别处理了iframe环境下的库加载和作用域问题
 * 使用完整版jsPDF库，确保所有API方法可用
 */

// 等待DOM完全加载
document.addEventListener('DOMContentLoaded', function() {
    // 初始化加载流程
    initLoader();
});

/**
 * 初始化加载流程
 */
function initLoader() {
    // 加载所需的外部库
    loadExternalLibraries()
        .then(() => {
            // 加载PyScript环境
            setupPythonEnvironment();
            
            // 加载报告下载功能
            loadReportDownloadFeature();
        })
        .catch(error => {
            console.error('加载外部库失败:', error);
        });
}

/**
 * 加载外部库
 * @returns {Promise} - 所有库加载完成的Promise
 */
function loadExternalLibraries() {
    return Promise.all([
        // 这里可以添加其他需要的库
    ]);
}

/**
 * 设置Python环境
 */
function setupPythonEnvironment() {
    // 获取iframe元素
    const iframe = document.getElementById('main-content');
    const iframeWindow = iframe.contentWindow;
    const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
    
    // 创建PyScript配置元素
    const pyConfig = iframeDocument.createElement('py-config');
    pyConfig.textContent = `
        packages = []
        [[fetch]]
        files = ["all_sys.py"]
    `;
    iframeDocument.body.appendChild(pyConfig);
    
    // 创建PyScript脚本元素
    const pyScript = iframeDocument.createElement('py-script');
    pyScript.id = 'py-script-main';
    pyScript.style.display = 'none'; // 隐藏脚本元素
    pyScript.textContent = `
import all_sys
from js import document, console

# 将Python函数暴露给JavaScript
def calculate_optimal_solution(project_power_mw, project_capacity_mwh, system_selection):
    try:
        # 转换输入参数
        project_power_mw = float(project_power_mw)
        project_capacity_mwh = float(project_capacity_mwh)
        
        # 根据系统选择调用相应的函数
        if system_selection == "5mw":
            result = all_sys.get_optimal_solution_for_dc_family("5MW", project_power_mw, project_capacity_mwh)
        elif system_selection == "7.5mw":
            result = all_sys.get_optimal_solution_for_dc_family("7.5MW", project_power_mw, project_capacity_mwh)
        else:  # overall
            result_5mw = all_sys.get_optimal_solution_for_dc_family("5MW", project_power_mw, project_capacity_mwh)
            result_7_5mw = all_sys.get_optimal_solution_for_dc_family("7.5MW", project_power_mw, project_capacity_mwh)
            
            if result_5mw["cost"] <= result_7_5mw["cost"]:
                result = result_5mw
            else:
                result = result_7_5mw
        
        # 返回JSON字符串
        import json
        return json.dumps(result)
    except Exception as e:
        console.error(f"Python计算错误: {str(e)}")
        return json.dumps({"error": str(e)})

console.log("Python script loaded and executed by Pyodide.")
`;
    iframeDocument.body.appendChild(pyScript);
    
    // 添加PyScript库
    const pyScriptLib = iframeDocument.createElement('script');
    pyScriptLib.defer = true;
    pyScriptLib.src = "https://pyscript.net/latest/pyscript.js";
    iframeDocument.head.appendChild(pyScriptLib);
}

/**
 * 加载报告下载功能
 */
function loadReportDownloadFeature() {
    // 获取iframe元素
    const iframe = document.getElementById('main-content');
    
    // 等待iframe内容加载完成
    if (iframe.contentDocument.readyState === 'loading') {
        iframe.onload = function() {
            injectDownloadFeature(iframe);
        };
    } else {
        injectDownloadFeature(iframe);
    }
}

/**
 * 注入下载功能
 * @param {HTMLIFrameElement} iframe - iframe元素
 */
function injectDownloadFeature(iframe) {
    const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
    
    // 加载完整版jsPDF库
    const jsPDFScript = iframeDocument.createElement('script');
    jsPDFScript.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    iframeDocument.head.appendChild(jsPDFScript);
    
    // 加载html2canvas库
    const html2canvasScript = iframeDocument.createElement('script');
    html2canvasScript.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    iframeDocument.head.appendChild(html2canvasScript);
    
    // 添加备用CDN脚本
    const backupScriptsCode = `
    // 检查jsPDF是否已加载
    setTimeout(function() {
        if (typeof window.jspdf === 'undefined') {
            console.log('jsPDF未通过主CDN加载，尝试备用源');
            
            // 加载备用jsPDF
            const backupJsPDF = document.createElement('script');
            backupJsPDF.src = "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js";
            document.head.appendChild(backupJsPDF);
        }
        
        // 检查html2canvas是否已加载
        if (typeof window.html2canvas === 'undefined') {
            console.log('html2canvas未通过主CDN加载，尝试备用源');
            
            // 加载备用html2canvas
            const backupHtml2Canvas = document.createElement('script');
            backupHtml2Canvas.src = "https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js";
            document.head.appendChild(backupHtml2Canvas);
        }
    }, 1000);
    `;
    
    const backupScript = iframeDocument.createElement('script');
    backupScript.textContent = backupScriptsCode;
    iframeDocument.head.appendChild(backupScript);
    
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
            
            // 获取要捕获的元素
            const reportSection = document.getElementById('solution-summary-metrics');
            
            if (!reportSection) {
                hideLoadingIndicator(loadingIndicator);
                alert('未找到报告内容，请先计算方案');
                return;
            }
            
            // 添加PDF捕获准备类
            reportSection.classList.add('prepare-for-pdf-capture');
            
            // 使用html2canvas捕获元素
            const canvas = await html2canvas(reportSection, {
                scale: 2, // 提高分辨率
                useCORS: true, // 允许跨域图片
                logging: false, // 关闭日志
                allowTaint: true, // 允许污染画布
                backgroundColor: '#ffffff' // 设置白色背景
            });
            
            // 移除PDF捕获准备类
            reportSection.classList.remove('prepare-for-pdf-capture');
            
            // 检查jsPDF是否可用
            if (!window.jspdf) {
                throw new Error('jsPDF库未正确加载，将尝试图片下载');
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
            
            // 获取要捕获的元素
            const reportSection = document.getElementById('solution-summary-metrics');
            
            if (!reportSection) {
                hideLoadingIndicator(loadingIndicator);
                alert('未找到报告内容，请先计算方案');
                return;
            }
            
            // 添加PDF捕获准备类（同样适用于图片捕获）
            reportSection.classList.add('prepare-for-pdf-capture');
            
            // 使用html2canvas捕获元素
            const canvas = await html2canvas(reportSection, {
                scale: 2, // 提高分辨率
                useCORS: true, // 允许跨域图片
                logging: false, // 关闭日志
                allowTaint: true, // 允许污染画布
                backgroundColor: '#ffffff' // 设置白色背景
            });
            
            // 移除PDF捕获准备类
            reportSection.classList.remove('prepare-for-pdf-capture');
            
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
        text.style.color = '#333333';
        
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
        
        // 返回加载指示器元素，以便后续移除
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
    
    const downloadScript = iframeDocument.createElement('script');
    downloadScript.textContent = downloadFunctionsCode;
    iframeDocument.head.appendChild(downloadScript);
    
    // 为下载按钮添加事件处理
    setTimeout(() => {
        const downloadButton = iframeDocument.getElementById('download-report-button');
        if (downloadButton) {
            downloadButton.addEventListener('click', function(e) {
                // 调用iframe中定义的处理函数
                iframe.contentWindow.handleDownloadButtonClick(e);
            });
        }
    }, 2000); // 延迟2秒，确保页面完全加载
}
