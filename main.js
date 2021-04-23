var svg = d3.select('svg');

// Get layout parameters
var svgWidth = +svg.attr('width');
var svgHeight = +svg.attr('height')*2;

var padding = {t: 40, r: 40, b: 40, l: 40};
var cellPadding = 10;

// Create a group element for appending chart elements
var chartG = svg.append('g')
    .attr('transform', 'translate('+[padding.l*2, padding.t]+')');

// var dataAttributes = [
//         'color', 'director_name', 'num_critic_for_reviews', 'duration',
//         'director_facebook_likes', 'actor_3_facebook_likes', 'actor_2_name', 'actor_1_facebook_likes',
//         'gross', 'genres', 'actor_1_name', 'movie_title', 'num_voted_users', 'cast_total_facebook_likes',
//         'actor_3_name', 'facenumber_in_poster', 'plot_keywords', 'movie_imdb_link', 'num_user_for_reviews',
//         'language', 'country', 'content_rating', 'budget', 'title_year', 'actor_2_facebook_likes', 'imdb_score',
//         'aspect_ratio', 'movie_facebook_likes'
//     ]

var dataAttributes = ['budget', 'gross', 'genres']
// var dataAttributes = ['budget', 'gross']

var N = dataAttributes.length;

// Compute chart dimensions
var cellWidth = (svgWidth - padding.l - padding.r) / N;
var cellHeight = (svgHeight - padding.t - padding.b) / N;

// Global x and y scales to be used for all SplomCells
var xScale = d3.scaleLinear().range([0, cellWidth - cellPadding]);
var yScale = d3.scaleLinear().range([cellHeight - cellPadding, 0]);
// axes that are rendered already for you
// var xAxis = d3.axisTop(xScale).ticks(6).tickSize(-cellHeight * N, 0, 0);
// var yAxis = d3.axisLeft(yScale).ticks(6).tickSize(-cellWidth * N, 0, 0);
var xAxis = d3.axisTop(xScale).ticks(4).tickSize(-cellHeight, 0, 0).tickFormat(d3.format("$.0s"));
var yAxis = d3.axisLeft(yScale).ticks(6).tickSize(-cellWidth, 0, 0).tickFormat(d3.format("$.0s"));

// Ordinal color scale for cylinders color mapping
var colorScale = d3.scaleOrdinal(d3.schemeCategory10);
// Map for referencing min/max per each attribute
var extentByAttribute = {};
// Object for keeping state of which cell is currently being brushed
var brushCell;

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

var cells = [];
function drawGraphs() {
    d3.csv('data/movies.csv', dataPreprocessor).then(function(dataset) {
        
            movies = dataset;
            // console.log(movies);

            // Create map for each attribute's extent (min, max)
            dataAttributes.forEach(function(attribute){
                extentByAttribute[attribute] = d3.extent(dataset, function(d){
                    return d[attribute];
                });
            });

            console.log(extentByAttribute);

            // Render gridlines and labels
            /// NOTE: This should be chartG for the scatPlot,
            /// but should probably make a different group for future plots
            chartG.selectAll('.axis').remove();
            chartG.selectAll('.x.axis')
                .data([dataAttributes[0]])
                .enter()
                .append('g')
                .attr('class', 'x axis')
                .attr('transform', function(d, i){
                    return 'translate('+[cellPadding / 2, 0]+')';
                })
                .each(function(attribute){
                    xScale.domain(extentByAttribute['budget']);
                    d3.select(this).call(xAxis);
                    d3.select(this).append('text')
                        .text("Budget")
                        .attr('class', 'axis-label')
                        .attr('transform', 'translate('+[(cellWidth - cellPadding)/2, -20]+')');
                });

            chartG.selectAll('.y.axis')
                .data([dataAttributes[1]])
                .enter()
                .append('g')
                .attr('class', 'y axis')
                .attr('transform', function(d, i){
                    return 'translate('+[0, cellPadding/2]+')';
                })
                .each(function(attribute){
                    yScale.domain(extentByAttribute['gross']);
                    d3.select(this).call(yAxis);
                    d3.select(this).append('text')
                        .text("Gross")
                        .attr('class', 'axis-label')
                        .attr('transform', 'translate('+[-50, (cellHeight - cellPadding)/2]+')rotate(270)');
                })

        });
}


// Used for processing the CSV file
function dataPreprocessor(row) {
    genres = row['genres'].split("|");
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
        'budget': +row['budget'],
        'gross': +row['gross'],
        'genres': genres,
        'title_year': +row['title_year'],
    };
}