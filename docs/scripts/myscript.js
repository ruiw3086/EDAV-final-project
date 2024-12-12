// add your JavaScript/D3 to this file

// Load the dataset and process the data
d3.csv("https://raw.githubusercontent.com/krishengit/EDAV-final-project/main/Datasets/historical_emissions.csv").then(data => {
  console.log("Raw data loaded:", data);

  // Step 1: Filter and transform the dataset
  const cleanedData = data.filter(d => {
    return Object.values(d).every(value => value !== "NA" && value !== "N/A");
  });

  const yearColumns = Object.keys(cleanedData[0]).filter(key => !isNaN(+key));
  const dataLong = [];

  cleanedData.forEach(row => {
    yearColumns.forEach(year => {
      const emissions = +row[year];
      if (!isNaN(emissions)) {
        dataLong.push({
          Country: row["Country"],
          Gas: row["Gas"],
          Sector: row["Sector"],
          Year: +year,
          Emissions: emissions
        });
      }
    });
  });

  const filteredData = dataLong.filter(d => d.Gas === "CO2" && d.Sector === "Total including LUCF");
  const globalEmissions = d3.rollup(filteredData, v => d3.sum(v, d => d.Emissions), d => d.Year);
  const countryEmissions = d3.rollup(filteredData, v => d3.sum(v, d => d.Emissions), d => d.Country);
  const topCountries = Array.from(countryEmissions)
    .sort((a, b) => d3.descending(a[1], b[1]))
    .slice(1, 6)
    .map(d => d[0]);

  const topContributions = filteredData
    .filter(d => topCountries.includes(d.Country))
    .map(d => ({
      ...d,
      PercentageContribution: (d.Emissions / globalEmissions.get(d.Year)) * 100
    }));

  const groupedData = d3.group(topContributions, d => d.Country);

  // Setup SVG dimensions
  const width = 800, height = 400, margin = { top: 20, right: 150, bottom: 50, left: 50 };

  const svg = d3.select("#plot").append("svg")
    .attr("width", width)
    .attr("height", height);

  const xScale = d3.scaleLinear()
    .domain(d3.extent(topContributions, d => d.Year))
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(topContributions, d => d.PercentageContribution)])
    .range([height - margin.bottom, margin.top]);

  const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(topCountries);

  // Add axes
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(10).tickFormat(d3.format("d")));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale));

  // Tooltip for emissions
  const tooltip = d3.select("body").append("div")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid black")
    .style("padding", "5px")
    .style("display", "none");

  // Add lines and circles
  groupedData.forEach((values, country) => {
    const sanitizedCountry = country.replace(/[^a-zA-Z0-9]/g, "-");

    const line = d3.line()
      .x(d => xScale(d.Year))
      .y(d => yScale(d.PercentageContribution));

    svg.append("path")
      .datum(values)
      .attr("fill", "none")
      .attr("stroke", colorScale(country))
      .attr("stroke-width", 2)
      .attr("class", `line-${sanitizedCountry}`)
      .attr("d", line);

    svg.selectAll(`circle-${sanitizedCountry}`)
      .data(values)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.Year))
      .attr("cy", d => yScale(d.PercentageContribution))
      .attr("r", 4)
      .attr("fill", colorScale(country))
      .on("mouseover", (event, d) => {
        tooltip.style("display", "block")
          .html(`<strong>${d.Country}</strong><br>Year: ${d.Year}<br>Contribution: ${d.PercentageContribution.toFixed(2)}%<br>Emissions: ${d.Emissions.toFixed(2)}`)
          .style("left", `${event.pageX + 5}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", () => tooltip.style("display", "none"));
  });

  // Dropdown for country selection
  const selectedCountries = new Set();
  const dropdown = d3.select("#controls");

  const selectElement = dropdown.select("#countrySelect");
  selectElement.selectAll("option")
    .data(topCountries)
    .enter()
    .append("option")
    .text(d => d)
    .on("click", function (event) {
      const country = event.target.value;
      if (selectedCountries.has(country)) {
        selectedCountries.delete(country);
      } else {
        selectedCountries.add(country);
      }
    });

  dropdown.select("#resetButton")
    .on("click", () => {
      selectedCountries.clear();
      updateSelection();
    });
  
  // Add legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width - margin.right + 10},${margin.top})`);

  topCountries.forEach((country, i) => {
    legend.append("circle")
      .attr("cx", 0)
      .attr("cy", i * 20)
      .attr("r", 5)
      .attr("fill", colorScale(country));

  legend.append("text")
    .attr("x", 10)
    .attr("y", i * 20 + 5)
    .text(country)
    .style("font-size", "12px")
    .attr("alignment-baseline", "middle");
});


  // Add click event for year selection
  svg.on("click", (event) => {
    const xPos = d3.pointer(event, svg.node())[0];
    const selectedYear = Math.round(xScale.invert(xPos));

    const selectedData = topContributions.filter(d => selectedCountries.has(d.Country) && d.Year === selectedYear);
    const totalEmissions = d3.sum(selectedData, d => d.Emissions);
    const totalPercentage = d3.sum(selectedData, d => d.PercentageContribution);

    tooltip.style("display", "block")
      .html(`Year: ${selectedYear}<br>Selected Countries Total Emissions: ${totalEmissions.toFixed(2)}<br>Percentage of Global Emissions: ${totalPercentage.toFixed(2)}%`)
      .style("left", `${event.pageX + 5}px`)
      .style("top", `${event.pageY - 28}px`);
  });

  function updateSelection() {
    // Add logic if additional interactivity for selected countries is required
  }
});
