var svg = d3.select('svg');
var selectors = d3.select('.selectors');

// Get layout parameters
var svgWidth = +svg.attr('width');
var svgHeight = +svg.attr('height')*2;

var padding = {t: 80, r: 40, b: 40, l: 40};
var cellPadding = 10;

var dataAttributes = ['budget', 'gross', 'genres', 'title_year']
// var dataAttributes = ['budget', 'gross']

var N = dataAttributes.length;

// Compute chart dimensions
var cellWidth = (svgWidth - padding.l - padding.r) / 3;
var cellHeight = (svgHeight - padding.t - padding.b) / 6;

// Create a group element for appending chart elements
var chartSplot = svg.append('g')
    .attr('transform', 'translate('+[padding.l*2, padding.t]+')');

var chartBar = svg.append('g')
    .attr('transform', 'translate('+[padding.l*2, cellHeight + padding.t*2]+')');

var chartLine = svg.append('g')
    .attr('transform', 'translate('+[cellWidth + padding.l*4, padding.t]+')');


// Axis for scatter plot
var xScaleSplot = d3.scaleLinear().range([0, cellWidth - cellPadding]);
var yScaleSplot = d3.scaleLinear().range([cellHeight - cellPadding, 0]);
var xAxisSplot = d3.axisTop(xScaleSplot).ticks(4).tickSize(-cellHeight, 0, 0).tickFormat(d3.format("$.0s"));
var yAxisSplot = d3.axisLeft(yScaleSplot).ticks(6).tickSize(-cellWidth, 0, 0).tickFormat(d3.format("$.0s"));

// Axis for bar chart
// NOTE: this formatting gets a little weird for Billions because of SI abbreviations ($1 Billion = "$1.0G")
var xScaleBar = d3.scaleLinear().range([0, cellWidth - cellPadding]);
var yScaleBar = d3.scaleBand().range([0, cellWidth]);
var xAxisBar = d3.axisTop(xScaleBar).ticks(5).tickSize(-cellHeight, 0, 0).tickFormat(d3.format("$.0s"));
var yAxisBar = d3.axisLeft(yScaleBar);

// Axis for line chart
var xScaleLine = d3.scaleLinear().range([0, cellWidth - cellPadding]);
var yScaleLine = d3.scaleLinear().range([cellHeight - cellPadding, 0]);
var xAxisLine = d3.axisTop(xScaleLine).ticks(2016-2010).tickSize(-cellHeight, 0, 0).tickFormat(d3.format(""));
var yAxisLine = d3.axisLeft(yScaleLine).ticks(8).tickSize(-cellHeight, 0, 0).tickFormat(d3.format(""));

// Ordinal color scale for cylinders color mapping
// var colorScale = d3.scaleOrdinal(d3.schemeCategory10);
var colorScale = d3.scaleOrdinal(d3.schemePaired);

// Map for referencing min/max per each attribute
var extentByAttribute = {};
var allGenres = new Set();

// Add slider for year range
var sliderRange = d3
    .sliderBottom()
    .min(2010)
    .max(2016)
    .width(300)
    .tickFormat(d3.format(""))
    .ticks(5)
    .step(1)
    .default([2010, 2016])
    .fill('#2196f3')
    .on('onchange', val => {
        redraw();
        d3.select('p#value-range').text(val.map(d3.format("")).join('-'));
    });

var gRange = d3
    .select('div#slider-range')
    .append('svg')
    .attr('width', 500)
    .attr('height', 100)
    .append('g')
    .attr('transform', 'translate(30,30)');

gRange.call(sliderRange);

d3.select('p#value-range').text(
    sliderRange
        .value()
        .map(d3.format(""))
        .join('-')
);

// Tooltips
var toolTip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-12, 0])
    .html(function(d){
        var data = d3.select(d.target).attr('data');
        var x = d3.select(d.target).attr('cx');
        var y = d3.select(d.target).attr('cy')+10;

        chartSplot.selectAll('.tooltipLabel').remove();
        var label = chartSplot.append('text')
            .text(data)
            .attr('class', 'tooltipLabel')
            .attr('x', x)
            .attr('y', y)
            .style('font-size', '10')
    });


// Initial drawing of graphs
drawGraphs();
svg.call(toolTip);


function drawSplotChart(genreSelection, yearSelection) {
    // Build list of movies to plot
    var splotMovies = new Set();
    movies.forEach(function(m){
        if (yearSelection[0] <= m.title_year && m.title_year <= yearSelection[1]){
            m.genres.forEach(function(genre){
                if (genreSelection.includes(genre)){
                    splotMovies.add(m);
                }
            })
        }
    })
    splotMovies = Array.from(splotMovies);
    var budgetExtent = d3.extent(splotMovies, function(m){
        return m.budget;
    });
    var grossExtent = d3.extent(splotMovies, function(m){
        return m.gross;
    });


    // Render gridlines and labels for scatter plot
    chartSplot.selectAll('.axis').remove();
    chartSplot.selectAll('.x.axis')
        .data(["budget"])
        .enter()
        .append('g')
        .attr('class', 'x axis')
        .attr('transform', function(d, i){
            return 'translate('+[cellPadding / 2, 0]+')';
        })
        .each(function(attribute){
            xScaleSplot.domain(budgetExtent);
            d3.select(this).call(xAxisSplot);
            d3.select(this).append('text')
                .text("Budget")
                .attr('class', 'axis-label')
                .attr('transform', 'translate('+[(cellWidth - cellPadding)/2, -20]+')');
        });

    chartSplot.selectAll('.y.axis')
        .data(["gross"])
        .enter()
        .append('g')
        .attr('class', 'y axis')
        .attr('transform', function(d, i){
            return 'translate('+[0, cellPadding/2]+')';
        })
        .each(function(attribute){
            yScaleSplot.domain(grossExtent);
            d3.select(this).call(yAxisSplot);
            d3.select(this).append('text')
                .text("Gross")
                .attr('class', 'axis-label')
                .attr('transform', 'translate('+[-50, (cellHeight - cellPadding)/2]+')rotate(270)');
        });


    // Draw points on plot
    chartSplot.selectAll('.tooltipLabel').remove();
    chartSplot.selectAll('circle').remove();
    chartSplot.selectAll('circle')
        .data(splotMovies)
        .enter()
        .append('circle')
            .attr('cx', function(m){
                return xScaleSplot(m.budget);
            })
            .attr('cy', function(m){
                return yScaleSplot(m.gross);
            })
            .attr('r', 4)
            .style('fill', function(d){
                // Simply use the first genre in list of genres for color
                return colorScale(d.genres[0]);
            })
            .data(splotMovies, function(m){
                return m.movie_title;
            })
            .attr('data', function(m){
                return m.movie_title+" ("+m.title_year+")";
            })
            .on('mouseover', toolTip.show)  // Show tooltips on hovers
            .on('mouseout', toolTip.hide);
}


// Draw functions and handlers

function drawBarChart(genreSelection, yearSelection) {
    // Build data points to chart {Genre: TotalGenreBudget}
    combinedBudgets = {};
    movies.forEach(function(m){
        if (yearSelection[0] <= m.title_year && m.title_year <= yearSelection[1]) {
            m.genres.forEach(function(genre){
                if (genreSelection.includes(genre)) {
                    if (genre in combinedBudgets) {
                        combinedBudgets[genre] += m.budget;
                    } else {
                        combinedBudgets[genre] = m.budget;
                    }
                }
            });
        }
    });

    var combinedBudgetsExtent = [d3.min(Object.values(combinedBudgets)),
        d3.max(Object.values(combinedBudgets))]
    // set start of bar x-axis to 0
    combinedBudgetsExtent[0] = 0;


    chartBar.selectAll('.axis').remove();
    chartBar.selectAll('.x.axis')
        .data(["budget"])
        .enter()
        .append('g')
        .attr('class', 'x axis')
        .attr('transform', function(d, i){
            return 'translate('+[0, 0]+')';
        })
        .each(function(attribute){
            xScaleBar.domain(combinedBudgetsExtent);
            d3.select(this).call(xAxisBar);
            d3.select(this).append('text')
                .text("Combined Genre Budgets")
                .attr('class', 'axis-label')
                .attr('transform', 'translate('+[cellWidth/2-10, -20]+')');
        });

    chartBar.selectAll('.y.axis')
        .data(["genre"])
        .enter()
        .append('g')
        .attr('class', 'y axis')
        .attr('transform', function(d, i){
            return 'translate('+[0, cellPadding]+')';
        })
        .each(function(attribute){
            yScaleBar.domain(genreSelection);
            d3.select(this).call(yAxisBar);
        });

    // Add bars for genre spending
    var barThickness = cellHeight / genreSelection.length;
    chartBar.selectAll('rect').remove();
    chartBar.selectAll('rect')
        .data(genreSelection)
        .enter()
        .append('rect')
            .attr('transform', 'translate('+[0, cellPadding]+')') // Needed to match the y-axis
            .attr('x', 0)
            .attr('y', function(d){
                return yScaleBar(d);
            })
            .attr('width', function(d){
                return xScaleBar(combinedBudgets[d]);
            })
            .attr('height', barThickness)
            .attr('fill', function(g){
                return colorScale(g);
            });
}

function drawLineChart(genreSelection, yearSelection) {
    // Build data points to chart {Genre: {year_1: total_1, year_2: total_2, ...}}
    yearTotals = {};

    movies.forEach(function(m){
        if (yearSelection[0] <= m.title_year && m.title_year <= yearSelection[1]) {
            m.genres.forEach(function(genre){
                if (genreSelection.includes(genre)){
                    if (genre in yearTotals) {
                        if (m.title_year in yearTotals[genre]) {
                            yearTotals[genre][m.title_year] += 1;
                        } else {
                            yearTotals[genre][m.title_year] = 1;
                        }
                    } else {
                        yearTotals[genre] = {};
                        yearTotals[genre][m.title_year] = 1;
                    }
                }
            });
        }
    });

    // Find extent for data just generated
    var yearTotalsExtent = [999, 0]
    Object.entries(yearTotals).forEach(function(g){
        Object.entries(g[1]).forEach(function(y){
            if (y[1] < yearTotalsExtent[0]) {
                yearTotalsExtent[0] = y[1];
            }
            if (y[1] > yearTotalsExtent[1]) {
                yearTotalsExtent[1] = y[1];
            }
        });
    });

    // Had to reformat the data to work better with line function
    var convert = [];
    Object.entries(yearTotals).forEach(function(g){
        var dataPoints = [];
        Object.entries(g[1]).forEach(function(y){
            var point = {
                year: parseInt(y[0]),
                total: y[1]
            }
            dataPoints.push(point);
        });
        var node = {genre: g[0], data: dataPoints}
        convert.push(node);
    });

    // Axis for year line chart
    chartLine.selectAll('.axis').remove();
    chartLine.selectAll('.x.axis')
        .data(["title_year"])
        .enter()
        .append('g')
        .attr('class', 'x axis')
        .attr('transform', function(d, i){
            return 'translate('+[0, 0]+')';
        })
        .each(function(attribute){
            xScaleLine.domain(yearSelection);
            xAxisLine.ticks(yearSelection[1]-yearSelection[0], 'f');
            d3.select(this).call(xAxisLine);
            d3.select(this).append('text')
                .text('Release Year')
                .attr('class', 'axis-label')
                .attr('transform', 'translate('+[cellWidth/2, -20]+')');
        });

    chartLine.selectAll('.y.axis')
        .data(["total_for_year"])
        .enter()
        .append('g')
        .attr('class', 'x axis')
        .attr('transform', function(d, i){
            return 'translate('+[-10, 0]+')';
        })
        .each(function(attribute){
            yScaleLine.domain(yearTotalsExtent);
            d3.select(this).call(yAxisLine);
            d3.select(this).append('text')
                .text('Total # of Movies')
                .attr('class', 'axis-label')
                .attr('transform', 'translate('+[-30, (cellHeight-cellPadding)/2]+')rotate(270)');
        });

    // Add paths for each genre
    var lineIterpolate = d3.line()
        .x(d => xScaleLine(d.year))
        .y(d => yScaleLine(d.total));

    chartLine.selectAll('path').remove();
    chartLine.selectAll('path')
        .data(convert)
        .enter()
        .each(function(g){
            d3.select(this).append('path')
                .attr('class', 'line-plot')
                .attr('d', function(g, i){
                    return lineIterpolate(g.data)+"";
                })
                .attr('fill', 'none')
                .attr('stroke', function(g){
                    return colorScale(g.genre);
                })
                .style('stroke-width', 2);
        })
}

function redraw() {
    // Get genre selections from checkboxes
    var selected = [];
    d3.selectAll("input").each(function(d){ 
        if(d3.select(this).attr("type") == "checkbox") {
            if (d3.select(this).node().checked) {
                selected.push(d3.select(this).attr('id'));
            }
        }
    });

    // Get year selections
    var years = sliderRange.value()

    // Redraw graphs with new params
    drawSplotChart(selected, years);
    drawBarChart(selected, years);
    drawLineChart(selected, years);
}

function allOn() {
    d3.selectAll("input").each(function(d){ 
        if(d3.select(this).attr("type") == "checkbox") {
            d3.select(this).node().checked = true;
        }
    });
    redraw();
}

function allOff() {
    d3.selectAll("input").each(function(d){ 
        if(d3.select(this).attr("type") == "checkbox") {
            d3.select(this).node().checked = false;
        }
    });
    redraw();
}

var cells = [];
function drawGraphs() {
    d3.csv('data/filtered_movies.csv', dataPreprocessor).then(function(dataset) {
        
            movies = dataset;

            // Create map for each attribute's extent (min, max)
            dataAttributes.forEach(function(attribute){
                extentByAttribute[attribute] = d3.extent(dataset, function(d){
                    return d[attribute];
                });
            });

            // Draw the charts, given the parameters
            redraw();
        });
}


// Used for processing the CSV file
function dataPreprocessor(row) {
    // Get genres and add them to set to keep track of all genres
    genres = row['genres'].split("|");
    genres.forEach(function(g){
        allGenres.add(g);
    });

    return {
        'budget': +row['budget'],
        'gross': +row['gross'],
        'genres': genres,
        'title_year': +row['title_year'],
        'movie_title': row['movie_title']
    };
}