var svg = d3.select('svg');
var selectors = d3.select('.selectors');

// Get layout parameters
var svgWidth = +svg.attr('width');
var svgHeight = +svg.attr('height')*2;

var padding = {t: 40, r: 40, b: 40, l: 40};
var cellPadding = 10;


// var dataAttributes = [
//         'color', 'director_name', 'num_critic_for_reviews', 'duration',
//         'director_facebook_likes', 'actor_3_facebook_likes', 'actor_2_name', 'actor_1_facebook_likes',
//         'gross', 'genres', 'actor_1_name', 'movie_title', 'num_voted_users', 'cast_total_facebook_likes',
//         'actor_3_name', 'facenumber_in_poster', 'plot_keywords', 'movie_imdb_link', 'num_user_for_reviews',
//         'language', 'country', 'content_rating', 'budget', 'title_year', 'actor_2_facebook_likes', 'imdb_score',
//         'aspect_ratio', 'movie_facebook_likes'
//     ]

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
// axes that are rendered already for you
// var xAxis = d3.axisTop(xScale).ticks(6).tickSize(-cellHeight * N, 0, 0);
// var yAxis = d3.axisLeft(yScale).ticks(6).tickSize(-cellWidth * N, 0, 0);
var xAxisSplot = d3.axisTop(xScaleSplot).ticks(4).tickSize(-cellHeight, 0, 0).tickFormat(d3.format("$.0s"));
var yAxisSplot = d3.axisLeft(yScaleSplot).ticks(6).tickSize(-cellWidth, 0, 0).tickFormat(d3.format("$.0s"));

// Axis for bar chart
/// NOTE: this formatting gets a little weird for Billions because of SI abbreviations
var xScaleBar = d3.scaleLinear().range([0, cellWidth - cellPadding]);
var yScaleBar = d3.scaleBand().range([0, cellWidth]);
var xAxisBar = d3.axisTop(xScaleBar).ticks(7).tickSize(-cellHeight, 0, 0).tickFormat(d3.format("$.0s"));
var yAxisBar = d3.axisLeft(yScaleBar);

// Axis for line chart
var xScaleLine = d3.scaleLinear().range([0, cellWidth - cellPadding]);
var yScaleLine = d3.scaleLinear().range([cellHeight - cellPadding, 0]);
var xAxisLine = d3.axisTop(xScaleLine).ticks(2016-2010).tickSize(-cellHeight, 0, 0).tickFormat(d3.format(""));
var yAxisLine = d3.axisLeft(yScaleLine).ticks(8).tickSize(-cellHeight, 0, 0);

// Ordinal color scale for cylinders color mapping
var colorScale = d3.scaleOrdinal(d3.schemeCategory10);
// Map for referencing min/max per each attribute
var extentByAttribute = {};
// Object for keeping state of which cell is currently being brushed
var brushCell;

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

// onAxisChange();
drawGraphs();

// ****** Add reusable components here ****** //
function SplomCell(x, y, col, row) {
    this.x = x;
    this.y = y;
    this.col = col;
    this.row = row;
}

SplomCell.prototype.init = function(g) {
    var cell = d3.select(g);

    // Frame for scatter plot
    cell.append('rect')
        .attr('class', 'frame')
        .attr('width', cellWidth - cellPadding)
        .attr('height', cellHeight - cellPadding);

    // Frame for histogram
    cell.append('rect')
        .attr('class', 'bar frame')
        .attr('width', cellWidth)
        .attr('height', cellHeight - cellPadding)
        .attr('transform', 'translate('+[cellWidth + cellPadding*(7/2), 0]+')');
}

SplomCell.prototype.update = function(g, data) {
    var cell = d3.select(g);

    // Update the global x,yScale objects for this cell's x,y attribute domains
    xScale.domain(extentByAttribute[this.x]);
    yScale.domain(extentByAttribute[this.y]);

    // Save a reference of this SplomCell, to use within anon function scopes
    var _this = this;

    var dots = cell.selectAll('.dot')
        .data(data, function(d){
            return d.name +'-'+d.year+'-'+d.cylinders; // Create a unique id for the car
        });

    var dotsEnter = dots.enter()
        .append('circle')
        .attr('class', 'dot')
        .style("fill", function(d) { return colorScale(d.cylinders); })
        .attr('r', 4);

    // dotsEnter.on('mouseover', toolTip.show)
    //     .on('mouseout', toolTip.hide);

    dots.merge(dotsEnter).attr('cx', function(d){
            return xScale(d[_this.x]);
        })
        .attr('cy', function(d){
            return yScale(d[_this.y]);
        });

    dots.exit().remove();

    var rects = cell.selectAll('.rect')
        .data(data, function(d){
            return d.name+'-'+d.year+'-'+d.cylinders;
        });

    var rectsEnter = rects.enter()
        .append('rect')
        .attr('class', 'rect')
        .style('')
}

// Functions for handling brushing
function brushstart(cell) {
    // cell is the SplomCell object

    // Check if this g element is different than the previous brush
    if(brushCell !== this) {

        // Clear the old brush
        brush.move(d3.select(brushCell), null);

        // Update the global scales for the subsequent brushmove events
        xScale.domain(extentByAttribute[cell.x]);
        yScale.domain(extentByAttribute[cell.y]);

        // Save the state of this g element as having an active brush
        brushCell = this;
        minx = 99999;
        maxx = 0;
    }
}

function brushmove(cell) {
    // cell is the SplomCell object

    // Get the extent or bounding box of the brush event, this is a 2x2 array
    var e = d3.event.selection;
    if(e) {

        // Select all .dot circles, and add the "hidden" class if the data for that circle
        // lies outside of the brush-filter applied for this SplomCells x and y attributes
        svg.selectAll(".dot")
            .classed("hidden", function(d){
                var out = e[0] > xScale(d[cell.x]) || xScale(d[cell.x]) > e[1];
                return out;
            });

        svg.selectAll(".dot")
            .each(function(d){
                var c = this.attributes.class.textContent;
                var x = this.cx.baseVal.value;
                if (c=="dot"){
                    if (x < minx){minx = x}
                    if (x > maxx){maxx = x}
                }
            })

        svg.selectAll(".histogram.rect")
            .classed("hidden", function(d){
                var x = this.x.baseVal.value;
                var w = this.width.baseVal.value;

                var lower = e[0]+adjust;
                var upper = e[1]+w+adjust;

                var out = lower <= x && x <= upper;
                return !out;
            })
    }
}

function barbrushmove(cell) {
    var e = d3.event.selection;
    var w;
    if (e) {
        svg.selectAll('.histogram.rect')
            .classed("hidden", function(d){
                var x = this.x.baseVal.value;
                w = this.width.baseVal.value;
                var center = x + w/2

                var out = e[0] < center && e[1] > center;
                return !out;
            })

        svg.selectAll('.dot')
            .classed("hidden", function(d){
                var x = this.cx.baseVal.value;
                var lower = e[0]-adjust-w/2+15;
                // var upper = e[1]-adjust-w/2+15;
                var upper = e[1]-adjust;
                lower -= lower % w;
                // upper -= upper % w;
                var out = lower <= x && x <= upper;
                return !out;
            })
    }
}

function brushend() {
    // If there is no longer an extent or bounding box then the brush has been removed
    if(!d3.event.selection) {
        // Bring back all hidden .dot elements
        svg.selectAll('.hidden').classed('hidden', false);
        // Return the state of the active brushCell to be undefined
        brushCell = undefined;

        minCenter = 99999;
        maxCenter = 0;
    }
}

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
            .attr('r', 4);
}

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
    var combinedBudgetsExtent = [d3.min(Object.values(combinedBudgets)), d3.max(Object.values(combinedBudgets))]
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
                .text("Combined Genre Budget")
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
                // console.log(`y pos for ${d} is ${yScaleBar(d)}`);
                return yScaleBar(d);
            })
            .attr('width', function(d){
                // console.log(`Spending for ${d} was ${combinedBudgets[d]}`)
                return xScaleBar(combinedBudgets[d]);
            })
            .attr('height', barThickness);
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
    var yearTotalsExtent = [99, 0]
    Object.entries(yearTotals).forEach(function(g){
        Object.entries(g[1]).forEach(function(y){
            if (y[1] < yearTotalsExtent[0]) {
                yearTotalsExtent[0] = y[1];
            }
            if (y[1] > yearTotalsExtent[1]) {
                yearTotalsExtent[1] = y[1];
            }
        });
    })

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
            xScaleLine.domain(extentByAttribute[attribute]);
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
}

function redraw() {
    /// TODO: years/checkboxes may need to be two separate functions
    ///         might make things a little faster??
    
    // Get genre selections from checkboxes
    var selected = [];
    d3.selectAll("input").each(function(d){ 
        if(d3.select(this).attr("type") == "checkbox") {
            if (d3.select(this).node().checked) {
                selected.push(d3.select(this).attr('id'));
            }
        }
    });
    console.log(selected);

    // Get year selections
    var years = sliderRange.value()
    console.log(`sliderRange: ${years}`)

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
            console.log(movies);

            // Create map for each attribute's extent (min, max)
            dataAttributes.forEach(function(attribute){
                extentByAttribute[attribute] = d3.extent(dataset, function(d){
                    return d[attribute];
                });
            });

            // console.log(extentByAttribute);
            // console.log(allGenres);

            // Draw the charts, given the parameters
            redraw();
        });
}


// Used for processing the CSV file
function dataPreprocessor(row) {
    // Get genres and add them to set
    genres = row['genres'].split("|");
    genres.forEach(function(g){
        allGenres.add(g);
    });

    return {
        // 'color': row['color'],
        // 'director_name': row['director_name'],
        // 'num_critic_for_reviews': +row['num_critic_for_reviews'],
        // 'duration': +row['duration'],
        // 'director_facebook_likes': +row['director_facebook_likes'],
        // 'actor_3_facebook_likes': +row['actor_3_facebook_likes'],
        // 'actor_2_name': row['actor_2_name'],
        // 'actor_1_facebook_likes': +row['actor_1_facebook_likes'],
        // 'gross': +row['gross'],
        // // 'genres': row['genres'],
        // 'genres': genres,
        // 'actor_1_name': row['actor_1_name'],
        // 'movie_title': row['movie_title'],
        // 'num_voted_users': +row['num_voted_users'],
        // 'cast_total_facebook_likes': +row['cast_total_facebook_likes'],
        // 'actor_3_name': row['actor_3_name'],
        // 'facenumber_in_poster': +row['facenumber_in_poster'],
        // 'plot_keywords': row['plot_keywords'],
        // 'movie_imdb_link': row['movie_imdb_link'],
        // 'num_user_for_reviews': +row['num_user_for_reviews'],
        // 'language': row['language'],
        // 'country': row['country'],
        // 'content_rating': row['content_rating'],
        // 'budget': +row['budget'],
        // 'title_year': +row['title_year'],
        // 'actor_2_facebook_likes': +row['actor_2_facebook_likes'],
        // 'imdb_score': +row['imdb_score'],
        // 'aspect_ratio': +row['aspect_ratio'],
        // 'movie_facebook_likes': +row['movie_facebook_likes']

        //// Only use the cols actually needed
        'budget': +row['budget'],
        'gross': +row['gross'],
        'genres': genres,
        'title_year': +row['title_year'],
        'movie_title': row['movie_title']
    };
}