const searchBar = document.querySelector("input#project-search");

const projectsDiv = document.querySelector("div.results");
const projects = [];
const sortTypes = [
  "name (a-z)",
  "name (z-a)",
];
const tags = [
  "Scratch",
  "Art",
  "Javascript",
  "HTML",
  "Webgl",
  "Nodejs",
  "cpp",
]

function parseProjects() {
  projectsDiv.querySelectorAll("a").forEach(item => {
    const obj = {
      name: item.dataset.name,
      tags: JSON.parse(item.dataset.tags),
      html: item.outerHTML,
    }
    projects.push(obj);
  });
}

/* function sortProjects(_projects, type) {
  let items = _projects;
  if (type == "name (a-z)") items.sort((a, b) => a.name.localeCompare(b.name));
  if (type == "name (z-a)") items.sort((a, b) => a.name.localeCompare(b.name)).reverse();
  return items;
}

function filterProjects(_projects, tags) {
  const lowerTags = [];
  tags.forEach(tag => {
    lowerTags.push(tag.toLowerCase());
  });

  let found = [];
  // Filter
  _projects.forEach(item => {
    for (let i = 0; i < tags.length; i++) {
      if (item.tags.includes(tags[i])) {
        if (found.includes(item)) break;
        found.push(item);
        break;
      }
    }
  });
  return found;
} */

function searchProjects(_projects, name) {
  let found = [];
  _projects.forEach(item => {
    if (item.name.toLowerCase().indexOf(name) != -1) found.push(item);
  })
  return found;
}

searchBar.addEventListener('keyup', () => {
  const proj = searchProjects(projects, searchBar.value.toLowerCase());
  let htmlString = "";

  proj.forEach(item => {
    htmlString += item.html;
  });

  projectsDiv.innerHTML = htmlString;
});

parseProjects();