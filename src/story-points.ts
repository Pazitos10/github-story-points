import { debounce } from './utils';

const waitMs = 500;

interface State {
  closed: number;
  doing: number;
  open: number;
}

let state: State = { closed: 0, doing: 0, open: 0 };

const column_selector = 'div[class*=column-frame]:not(.hidden)';
const columns = () => document.querySelectorAll(column_selector);


const createProgressBar = () : HTMLDivElement => {
  const pb_div_container: HTMLDivElement = document.createElement("div");
  pb_div_container.classList.add('pb-container');
  pb_div_container
    .setAttribute("style", 
      "width: 300px; margin-left: 30px; align-self: center"
    );

  const tooltip: HTMLDivElement = document.createElement("div");
  tooltip.classList.add('tooltipped', 'tooltiped-s');
  tooltip.setAttribute("aria-label", "0 to do / 0 in progress / 0 done");

  const pb_span_container: HTMLSpanElement = document.createElement("span");
  pb_span_container.classList.add('progress-bar', 'progress-bar-small', 'd-flex');

  const pb_success_span: HTMLSpanElement = document.createElement("span");
  pb_success_span.classList.add('progress', 'color-bg-success-emphasis');
  pb_success_span.setAttribute("style", "width: 0.0%");

  const pb_done_span: HTMLSpanElement = document.createElement("span");
  pb_done_span.classList.add('progress', 'color-bg-done-emphasis');
  pb_done_span.setAttribute("style", "width: 0.0%");

  pb_span_container.appendChild(pb_success_span);
  pb_span_container.appendChild(pb_done_span);
  tooltip.appendChild(pb_span_container);
  pb_div_container.appendChild(tooltip);

  return pb_div_container;
}

const project_name_span_selector = "span[role=tooltip]";
const insertProgressBar = (progressBar: HTMLDivElement) => {
  document.querySelector(project_name_span_selector)?.parentElement?.appendChild(progressBar);
}

const updateProgressBarTooltip = () => {
  const tooltip = document.querySelector('.pb-container .tooltipped');
  tooltip?.setAttribute('aria-label', `${state.open} to do / ${state.doing} in progress / ${state.closed} done`)
}


const column_title_selector = "div[data-test-id=board-view-column-title-text]";
const accumulatePoint = (link: HTMLLinkElement, point: number) => {
  const previousElement = link.previousElementSibling;
  if (previousElement) {
    const column_title: string =
        link.closest(column_selector)?.querySelector(column_title_selector)?.innerHTML ??
        '';
    const isClosed = previousElement.querySelector('.octicon-issue-closed');
    const isDone = /(done|finished|finalizada)/i.test(column_title);
    
    if (isClosed || isDone){
        state.closed = state.closed + point;
    } else {
      if (column_title && /(doing|progress|wip|en desarrollo)/i.test(column_title)) {
        state.doing = state.doing + point;
      } else {
        state.open = state.open + point;
      }
    }
  }
  updateProgressBarTooltip();
};

const getPoint = (links: NodeList) =>
  Array.from(links)
    .map((link: any) => {
      const match = link.innerText.match(/\[(\d+(.\d+)?)pt\]/);
      if (match) {
        const point = parseFloat(match[1]);
        accumulatePoint(link, point);
        return point;
      }
    })
    .filter((n: number | undefined) => typeof n === 'number')
    .reduce(
      (acc: number, n: number | undefined) =>
        typeof n === 'number' ? acc + n : 0,
      0,
    );

const closed_color_selector = '.color-bg-success-emphasis';
const done_color_selector = '.color-bg-done-emphasis';
const setProgress = (progressBar: HTMLDivElement) => {

  if (!progressBar) {
    progressBar = createProgressBar();
    insertProgressBar(progressBar);
  }

  (progressBar.querySelector(closed_color_selector) as HTMLSpanElement).style.width = `${
    (state.closed / (state.closed + state.doing + state.open)) * 100
  }%`;

  (progressBar.querySelector(done_color_selector) as HTMLSpanElement).style.width = `${
    (state.doing / (state.closed + state.doing + state.open)) * 100
  }%`;
};

const card_counter_selector = 'span[data-test-id=column-counter]'
const showTotalPoints = () => {
  const counter = document.querySelector(card_counter_selector); //'.js-column-card-count');

  if (counter) {
    const pointNode = document.querySelector(
      '.js-github-story-points-total-counter',
    ) as HTMLSpanElement;
    const label = `${state.closed}pt / ${
      state.open + state.doing + state.closed
    }pt`;

    const progressBar = document.querySelector(
      '.pb-container',
    ) as HTMLDivElement;
    setProgress(progressBar);

    if (pointNode) {
      pointNode.innerText = label;
    } else {
      let pointNode = counter.cloneNode(false) as HTMLSpanElement;
      pointNode.classList.add('js-github-story-points-total-counter');
      pointNode.style.alignSelf = "center";
      pointNode.style.fontSize = "14px";
      pointNode.style.backgroundColor = "dodgerblue";
      pointNode.style.color = "white";
      pointNode.innerText = label;
      pointNode.removeAttribute('aria-label');
      const menu = document.querySelector('.pb-container')?.parentElement;
      if (menu) {
        menu.appendChild(pointNode);
      }
    }
  }
};

const card_issue_link_selector = 'a[data-test-id=card-side-panel-trigger]'; 
const cards_selector = 'div[data-test-id=board-view-column-card]'; 
const callback = () => {
  columns().forEach((column) => {
    const links = column.querySelectorAll(
      //'.js-project-column-card:not(.d-none) .js-project-card-issue-link',
      `${cards_selector} ${card_issue_link_selector}`
    );

    const point = getPoint(links);

    const pointNode = column.querySelector(
      '.js-github-story-points-counter',
    ) as HTMLSpanElement;
    const label = `${point}pt`;

    if (point === 0 && !pointNode) {
      return;
    } else if (point === 0 && !!pointNode) {
      pointNode.remove();
    } else {
      if (pointNode) {
        pointNode.innerText = label;
      } else {
        const counter = column.querySelector(card_counter_selector); //'.js-column-card-count');

        if (counter) {
          let pointNode = counter.cloneNode(false) as HTMLSpanElement;
          pointNode.classList.add('js-github-story-points-counter');
          pointNode.innerText = label;
          pointNode.style.backgroundColor = "dodgerblue";
          pointNode.style.color = "white";
          pointNode.setAttribute('aria-label', label);
          counter.insertAdjacentHTML('afterend', pointNode.outerHTML);
        }
      }
    }
  });

  showTotalPoints();
  state = { closed: 0, doing: 0, open: 0 };
};

const project_columns_selector = 'div[data-test-id=board-view]';
const observer = new MutationObserver(debounce(callback, waitMs));
const targetNode = document.querySelector(project_columns_selector); //)'.js-project-columns');

const options = {
  attributes: true,
  subtree: true,
};

if (!!targetNode) {
  observer.observe(targetNode, options);
} else {
  throw new Error(`column selector ${column_selector} is missing`);
}
