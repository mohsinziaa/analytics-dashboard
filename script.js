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
    let skuChart = null;

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
        if (skuChart) skuChart.destroy();

        // Count availability metrics
        const availabilityMetrics = {
            'SUPER REGULAR': { 'Available': 0, 'Not Available': 0 },
            'EXTREME REGULAR': { 'Available': 0, 'Not Available': 0 },
            'PALLET AVAILABILITY': { 'Available': 0, 'Not Available': 0 }
        };

        allData.forEach(row => {
            // SUPER REGULAR count
            if (row['SUPER REGULAR'] && row['SUPER REGULAR'].toString().toUpperCase() === 'YES') {
                availabilityMetrics['SUPER REGULAR']['Available']++;
            } else {
                availabilityMetrics['SUPER REGULAR']['Not Available']++;
            }

            // EXTREME REGULAR count
            if (row['EXTREME REGULAR'] && row['EXTREME REGULAR'].toString().toUpperCase() === 'YES') {
                availabilityMetrics['EXTREME REGULAR']['Available']++;
            } else {
                availabilityMetrics['EXTREME REGULAR']['Not Available']++;
            }

            // PALLET AVAILABILITY count
            if (row['PALLET AVAILABILITY'] && row['PALLET AVAILABILITY'].toString().toUpperCase() === 'YES') {
                availabilityMetrics['PALLET AVAILABILITY']['Available']++;
            } else {
                availabilityMetrics['PALLET AVAILABILITY']['Not Available']++;
            }
        });

        // Create availability metrics chart
        const availabilityCtx = document.getElementById('availabilityChart').getContext('2d');
        const availabilityChart = new Chart(availabilityCtx, {
            type: 'bar',
            data: {
                labels: ['SUPER REGULAR', 'EXTREME REGULAR', 'PALLET AVAILABILITY'],
                datasets: [
                    {
                        label: 'Available',
                        data: [
                            availabilityMetrics['SUPER REGULAR']['Available'],
                            availabilityMetrics['EXTREME REGULAR']['Available'],
                            availabilityMetrics['PALLET AVAILABILITY']['Available']
                        ],
                        backgroundColor: 'rgba(46, 204, 113, 0.7)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Not Available',
                        data: [
                            availabilityMetrics['SUPER REGULAR']['Not Available'],
                            availabilityMetrics['EXTREME REGULAR']['Not Available'],
                            availabilityMetrics['PALLET AVAILABILITY']['Not Available']
                        ],
                        backgroundColor: 'rgba(231, 76, 60, 0.7)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Product Availability Distribution',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'top'
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

        // Count customers and duplicates
        const customerCounts = {};
        allData.forEach(row => {
            const customer = row['CUSTOMER'];
            if (customer) {
                customerCounts[customer] = (customerCounts[customer] || 0) + 1;
            }
        });

        // Calculate metrics
        const totalVisits = allData.length;
        const outletsVisitedOnce = Object.values(customerCounts).filter(count => count === 1).length;
        const outletsVisitedMultiple = Object.values(customerCounts).filter(count => count > 1).length;

        // Create customer analytics chart
        const customerCtx = document.getElementById('customerChart').getContext('2d');
        customerChart = new Chart(customerCtx, {
            type: 'bar',
            data: {
                labels: ['Total Visits', 'Outlets Visited Once', 'Outlets Visited Multiple Times'],
                datasets: [{
                    label: 'Outlet Statistics',
                    data: [totalVisits, outletsVisitedOnce, outletsVisitedMultiple],
                    backgroundColor: [
                        'rgba(52, 152, 219, 0.7)',
                        'rgba(46, 204, 113, 0.7)',
                        'rgba(155, 89, 182, 0.7)'
                    ],
                    borderColor: [
                        'rgba(52, 152, 219, 1)',
                        'rgba(46, 204, 113, 1)',
                        'rgba(155, 89, 182, 1)'
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
                        text: 'Outlet Visit Statistics',
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
                            text: 'Number of Visits/Outlets',
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

        // Count trades
        const tradeCounts = {};
        allData.forEach(row => {
            const trade = row['TRADE'];
            if (trade) {
                tradeCounts[trade] = (tradeCounts[trade] || 0) + 1;
            }
        });

        // Weekly visit trends
        const weeklyVisits = {
            'Week 1 (2-8 Apr)': 0,
            'Week 2 (9-15 Apr)': 0,
            'Week 3 (16-22 Apr)': 0,
            'Week 4 (23-30 Apr)': 0
        };

        allData.forEach(row => {
            const dateStr = row['DATE'];
            if (dateStr) {
                // Parse the date in format "d.m.yyyy"
                const [day, month, year] = dateStr.split('.').map(Number);
                const date = new Date(year, month - 1, day); // month is 0-based in JavaScript
                
                if (day >= 2 && day <= 8) {
                    weeklyVisits['Week 1 (2-8 Apr)']++;
                } else if (day >= 9 && day <= 15) {
                    weeklyVisits['Week 2 (9-15 Apr)']++;
                } else if (day >= 16 && day <= 22) {
                    weeklyVisits['Week 3 (16-22 Apr)']++;
                } else if (day >= 23 && day <= 30) {
                    weeklyVisits['Week 4 (23-30 Apr)']++;
                }
            }
        });

        // Create weekly trend chart
        const weeklyTrendCtx = document.getElementById('dailyTrendChart').getContext('2d');
        dailyTrendChart = new Chart(weeklyTrendCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(weeklyVisits),
                datasets: [{
                    label: 'Weekly Visits',
                    data: Object.values(weeklyVisits),
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Weekly Visit Trends (April 2025)',
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

        // SKU Availability Analysis
        const skuAvailability = {
            'SUPER Available': 0,
            'EXTREME Available': 0,
            'BOTH Available': 0,
            'None Available': 0
        };

        allData.forEach(row => {
            const sku = row['AVAILABLE SKU'];
            if (sku) {
                const skuValue = sku.toString().trim().toUpperCase();
                if (skuValue === 'SUPER 5KG') {
                    skuAvailability['SUPER Available']++;
                } else if (skuValue === 'EXTREME 5KG') {
                    skuAvailability['EXTREME Available']++;
                } else if (skuValue === 'BOTH') {
                    skuAvailability['BOTH Available']++;
                }
            } else {
                skuAvailability['None Available']++;
            }
        });

        // Create SKU availability chart
        const skuCtx = document.getElementById('skuChart').getContext('2d');
        skuChart = new Chart(skuCtx, {
            type: 'bar',
            data: {
                labels: ['SUPER Available', 'EXTREME Available', 'BOTH Available', 'None Available'],
                datasets: [{
                    label: 'Number of Visits',
                    data: [
                        skuAvailability['SUPER Available'],
                        skuAvailability['EXTREME Available'],
                        skuAvailability['BOTH Available'],
                        skuAvailability['None Available']
                    ],
                    backgroundColor: [
                        'rgba(52, 152, 219, 0.7)',  // Blue for SUPER
                        'rgba(46, 204, 113, 0.7)',  // Green for EXTREME
                        'rgba(155, 89, 182, 0.7)',  // Purple for BOTH
                        'rgba(231, 76, 60, 0.7)'    // Red for None
                    ],
                    borderColor: [
                        'rgba(52, 152, 219, 1)',
                        'rgba(46, 204, 113, 1)',
                        'rgba(155, 89, 182, 1)',
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
                        text: 'SKU Availability Distribution',
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

        // Duplicate Outlet Visits Analysis
        const outletVisits = {};
        allData.forEach(row => {
            const outlet = row['CUSTOMER'];
            const date = row['DATE'];
            if (outlet) {
                if (!outletVisits[outlet]) {
                    outletVisits[outlet] = {
                        dates: [],
                        count: 0
                    };
                }
                outletVisits[outlet].dates.push(date);
                outletVisits[outlet].count++;
            }
        });

        // Filter for outlets with multiple visits
        const duplicateOutlets = Object.entries(outletVisits)
            .filter(([_, data]) => data.count > 1)
            .sort((a, b) => b[1].count - a[1].count);

        // Populate duplicate visits table
        const tableBody = document.querySelector('#duplicateVisitsTable tbody');
        tableBody.innerHTML = '';
        
        duplicateOutlets.forEach(([outlet, data]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${outlet}</td>
                <td>${data.dates.join(', ')}</td>
                <td>${data.count}</td>
            `;
            tableBody.appendChild(row);
        });
    }
});
