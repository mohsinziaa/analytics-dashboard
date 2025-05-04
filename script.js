document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const excelData = document.getElementById('excelData');
    const toggleViewBtn = document.getElementById('toggleViewBtn');
    const chartsContainer = document.getElementById('chartsContainer');
    const fileInfo = document.getElementById('fileInfo');
    let allData = []; // Store the data globally
    let customerChart = null;
    let tradeChart = null;
    let dailyTrendChart = null;
    let palletChart = null;

    // Initially hide the data container
    excelData.style.display = 'none';

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Show file info
        fileInfo.innerHTML = `<p><i class="fas fa-file-excel"></i> Selected file: ${file.name}</p>`;
        
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Define the desired headers
                const desiredHeaders = [
                    'SRNO', 'DATE', 'CUSTOMER', 'TRADE', 'SUPER REGULAR',
                    'EXTREME REGULAR', 'PALLET AVAILABILITY', 'AVAILABLE SKU'
                ];
                
                // Reset data array
                allData = [];
                let srNo = 1;

                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    if (jsonData.length <= 1) return;
                    
                    const headers = jsonData[0];
                    const columnIndices = desiredHeaders.map(desiredHeader => 
                        headers.findIndex(h => h && h.toString().trim() === desiredHeader)
                    );
                    
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.length === 0 || 
                            row.some(cell => cell && cell.toString().trim() === 'DATE')) {
                            continue;
                        }
                        
                        const dateValue = row[columnIndices[1]];
                        if (dateValue) {
                            const newRow = {
                                'SRNO': srNo++,
                                'DATE': dateValue,
                                'CUSTOMER': row[columnIndices[2]] || '',
                                'TRADE': row[columnIndices[3]] || '',
                                'SUPER REGULAR': row[columnIndices[4]] || '',
                                'EXTREME REGULAR': row[columnIndices[5]] || '',
                                'PALLET AVAILABILITY': row[columnIndices[6]] || '',
                                'AVAILABLE SKU': row[columnIndices[7]] || ''
                            };
                            allData.push(newRow);
                        }
                    }
                });

                // Create the compiled table
                let tableHTML = '<table>';
                tableHTML += '<thead><tr>';
                desiredHeaders.forEach(header => {
                    tableHTML += `<th>${header}</th>`;
                });
                tableHTML += '</tr></thead>';
                
                tableHTML += '<tbody>';
                allData.forEach(row => {
                    tableHTML += '<tr>';
                    desiredHeaders.forEach(header => {
                        tableHTML += `<td>${row[header]}</td>`;
                    });
                    tableHTML += '</tr>';
                });
                tableHTML += '</tbody></table>';
                
                excelData.innerHTML = tableHTML;
                toggleViewBtn.disabled = false;

                // Automatically show charts after file upload
                createCharts();
                chartsContainer.style.display = 'grid';
                excelData.style.display = 'none';
                toggleViewBtn.innerHTML = '<i class="fas fa-table"></i> Show Table';
            } catch (error) {
                console.error('Error reading Excel file:', error);
                excelData.innerHTML = '<p style="color: red;">Error reading Excel file. Please try again.</p>';
                toggleViewBtn.disabled = true;
                chartsContainer.style.display = 'none';
                fileInfo.innerHTML = '<p style="color: red;"><i class="fas fa-exclamation-circle"></i> Error reading file</p>';
            }
        };

        reader.onerror = function() {
            excelData.innerHTML = '<p style="color: red;">Error reading file. Please try again.</p>';
            toggleViewBtn.disabled = true;
            chartsContainer.style.display = 'none';
            fileInfo.innerHTML = '<p style="color: red;"><i class="fas fa-exclamation-circle"></i> Error reading file</p>';
        };

        reader.readAsArrayBuffer(file);
    });

    // Toggle view button click handler
    toggleViewBtn.addEventListener('click', function() {
        if (excelData.style.display === 'none') {
            excelData.style.display = 'block';
            chartsContainer.style.display = 'none';
            toggleViewBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Show Charts';
        } else {
            excelData.style.display = 'none';
            chartsContainer.style.display = 'grid';
            toggleViewBtn.innerHTML = '<i class="fas fa-table"></i> Show Table';
        }
    });

    function createCharts() {
        if (allData.length === 0) return;

        // Destroy existing charts if they exist
        if (customerChart) customerChart.destroy();
        if (tradeChart) tradeChart.destroy();
        if (dailyTrendChart) dailyTrendChart.destroy();
        if (palletChart) palletChart.destroy();

        // Count customers
        const customerCounts = {};
        allData.forEach(row => {
            const customer = row['CUSTOMER'];
            if (customer) {
                customerCounts[customer] = (customerCounts[customer] || 0) + 1;
            }
        });

        // Count trades
        const tradeCounts = {};
        allData.forEach(row => {
            const trade = row['TRADE'];
            if (trade) {
                tradeCounts[trade] = (tradeCounts[trade] || 0) + 1;
            }
        });

        // Daily visit trends
        const dailyVisits = {};
        allData.forEach(row => {
            const date = row['DATE'];
            if (date) {
                dailyVisits[date] = (dailyVisits[date] || 0) + 1;
            }
        });

        // Pallet availability analysis
        const palletAvailability = {
            'Available': 0,
            'Not Available': 0
        };
        allData.forEach(row => {
            const pallet = row['PALLET AVAILABILITY'];
            if (pallet) {
                if (pallet.toString().toLowerCase().includes('yes') || 
                    pallet.toString().toLowerCase().includes('available')) {
                    palletAvailability['Available']++;
                } else {
                    palletAvailability['Not Available']++;
                }
            }
        });

        // Create customer chart
        const customerCtx = document.getElementById('customerChart').getContext('2d');
        customerChart = new Chart(customerCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(customerCounts),
                datasets: [{
                    label: 'Number of Visits by Customer',
                    data: Object.values(customerCounts),
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Customer Visit Distribution',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Visits',
                            font: {
                                weight: 'bold'
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });

        // Create trade chart
        const tradeCtx = document.getElementById('tradeChart').getContext('2d');
        tradeChart = new Chart(tradeCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(tradeCounts),
                datasets: [{
                    data: Object.values(tradeCounts),
                    backgroundColor: [
                        'rgba(52, 152, 219, 0.7)',
                        'rgba(46, 204, 113, 0.7)',
                        'rgba(155, 89, 182, 0.7)',
                        'rgba(241, 196, 15, 0.7)',
                        'rgba(231, 76, 60, 0.7)'
                    ],
                    borderColor: [
                        'rgba(52, 152, 219, 1)',
                        'rgba(46, 204, 113, 1)',
                        'rgba(155, 89, 182, 1)',
                        'rgba(241, 196, 15, 1)',
                        'rgba(231, 76, 60, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Trade Distribution',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });

        // Create daily trend chart
        const dailyTrendCtx = document.getElementById('dailyTrendChart').getContext('2d');
        dailyTrendChart = new Chart(dailyTrendCtx, {
            type: 'line',
            data: {
                labels: Object.keys(dailyVisits),
                datasets: [{
                    label: 'Daily Visits',
                    data: Object.values(dailyVisits),
                    borderColor: 'rgba(46, 204, 113, 1)',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Daily Visit Trends',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Visits',
                            font: {
                                weight: 'bold'
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });

        // Create pallet availability chart
        const palletCtx = document.getElementById('palletChart').getContext('2d');
        palletChart = new Chart(palletCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(palletAvailability),
                datasets: [{
                    data: Object.values(palletAvailability),
                    backgroundColor: [
                        'rgba(46, 204, 113, 0.7)',
                        'rgba(231, 76, 60, 0.7)'
                    ],
                    borderColor: [
                        'rgba(46, 204, 113, 1)',
                        'rgba(231, 76, 60, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Pallet Availability Distribution',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }
});
