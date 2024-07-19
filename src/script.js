import * as d3 from 'd3';

const data = [10, 20, 30, 40, 50];

const width = 500;
const height = 300;

const svg = d3.select('#chart')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

svg.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', (d, i) => i * 50)
    .attr('y', d => height - d)
    .attr('width', 40)
    .attr('height', d => d)
    .attr('fill', 'steelblue');