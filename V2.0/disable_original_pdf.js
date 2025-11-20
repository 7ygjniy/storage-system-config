/**
 * 禁用原始PDF下载逻辑
 * 
 * 此脚本用于禁用iframe内部的所有PDF生成函数
 * 拦截原始下载按钮的点击事件，重定向到新的处理函数
 */

(function() {
    console.log('正在禁用原始PDF下载逻辑...');
    
    // 等待DOM完全加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', disableOriginalPDF);
    } else {
        disableOriginalPDF();
    }
    
    /**
     * 禁用原始PDF下载逻辑
     */
    function disableOriginalPDF() {
        try {
            console.log('开始禁用原始PDF下载逻辑');
            
            // 覆盖原始jsPDF对象
            if (window.jspdf) {
                console.log('覆盖原始jsPDF对象');
                const originalJsPDF = window.jspdf;
                window.jspdf = {
                    __disabled: true,
                    __original: originalJsPDF
                };
            }
            
            // 覆盖原始html2canvas对象
            if (window.html2canvas) {
                console.log('覆盖原始html2canvas对象');
                const originalHtml2Canvas = window.html2canvas;
                window.html2canvas = {
                    __disabled: true,
                    __original: originalHtml2Canvas
                };
            }
            
            // 监听下载按钮点击事件
            document.addEventListener('click', function(event) {
                // 查找下载按钮
                if (event.target && 
                    (event.target.id === 'download-report-btn' || 
                     event.target.classList.contains('download-btn') ||
                     (event.target.textContent && event.target.textContent.includes('下载')) ||
                     (event.target.innerText && event.target.innerText.includes('下载')))) {
                    
                    console.log('拦截到下载按钮点击事件');
                    
                    // 阻止默认行为
                    event.preventDefault();
                    event.stopPropagation();
                    
                    // 调用新的处理函数
                    if (window.parent && window.parent.handleNewPDFDownload) {
                        console.log('调用顶层页面的处理函数');
                        window.parent.handleNewPDFDownload();
                    } else {
                        console.error('未找到顶层页面的处理函数');
                    }
                    
                    return false;
                }
            }, true);
            
            // 覆盖原始下载函数
            if (window.downloadReport) {
                console.log('覆盖原始downloadReport函数');
                const originalDownloadReport = window.downloadReport;
                window.downloadReport = function() {
                    console.log('拦截到downloadReport函数调用');
                    
                    // 调用新的处理函数
                    if (window.parent && window.parent.handleNewPDFDownload) {
                        console.log('调用顶层页面的处理函数');
                        window.parent.handleNewPDFDownload();
                    } else {
                        console.error('未找到顶层页面的处理函数');
                    }
                };
            }
            
            // 覆盖原始downloadPDF函数
            if (window.downloadPDF) {
                console.log('覆盖原始downloadPDF函数');
                const originalDownloadPDF = window.downloadPDF;
                window.downloadPDF = function() {
                    console.log('拦截到downloadPDF函数调用');
                    
                    // 调用新的处理函数
                    if (window.parent && window.parent.handleNewPDFDownload) {
                        console.log('调用顶层页面的处理函数');
                        window.parent.handleNewPDFDownload();
                    } else {
                        console.error('未找到顶层页面的处理函数');
                    }
                };
            }
            
            // 覆盖原始generatePDF函数
            if (window.generatePDF) {
                console.log('覆盖原始generatePDF函数');
                const originalGeneratePDF = window.generatePDF;
                window.generatePDF = function() {
                    console.log('拦截到generatePDF函数调用');
                    
                    // 调用新的处理函数
                    if (window.parent && window.parent.handleNewPDFDownload) {
                        console.log('调用顶层页面的处理函数');
                        window.parent.handleNewPDFDownload();
                    } else {
                        console.error('未找到顶层页面的处理函数');
                    }
                };
            }
            
            console.log('原始PDF下载逻辑禁用完成');
            
        } catch (error) {
            console.error('禁用原始PDF下载逻辑时出错:', error);
        }
    }
})();
