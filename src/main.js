import API from './api';
import Provider from "./provider";
import Store from "./store";

import ModelTripPoint from "./models/model-trip-point";

import TripPoint from './modules/trip-points/trip-point';
import TripPointEdit from './modules/trip-points/trip-point-edit';
import TravelDay from './modules/travel-day/travel-day';
import Filter from './modules/filters/filter';
import TotalCost from './modules/total-cost/total-cost';

import * as moment from 'moment/moment';

import createStatistics from './modules/statistics/statistics';

// API
const AUTHORIZATION = `Basic wqe21fwq32WEF32CDWae2d=${Math.random()}`;
const END_POINT = `https://es8-demo-srv.appspot.com/big-trip`;
const STORE_KEY = `store-key`;
const api = new API({endPoint: END_POINT, authorization: AUTHORIZATION});
const store = new Store({key: STORE_KEY, storage: localStorage});
const generateId = Date.now() + Math.random();
const provider = new Provider({api, store, generateId});

const tripDayContainer = document.querySelector(`.trip-points`);
const mainContainer = document.querySelector(`.main`);
const statisticsContainer = document.querySelector(`.statistic`);
const filtersContainer = document.querySelector(`.trip-filter`);
const sortingContainer = document.querySelector(`.trip-sorting`);

const filtersList = [
  {description: `Everything`, isChecked: true},
  {description: `Future`},
  {description: `Past`}
];

const sortingList = [
  {description: `Event`, isChecked: true},
  {description: `Time`},
  {description: `Price`},
  {description: `Offers`, isDisabled: true}
];

const tripPointMockData = {
  id: null,
  type: `sightseeing`,
  city: ``,
  destination: [],
  price: 0,
  dateStart: Date.now(),
  dateEnd: Date.now(),
  pictures: [],
  offers: [],
  description: ``,
  isFavorite: false,
};

const switchContainer = document.querySelector(`.view-switch__items`);
const switchItems = document.querySelectorAll(`.view-switch__item`);

const newTripPointButton = document.querySelector(`.new-event`);
const totalCostContainer = document.querySelector(`.trip__total`);

// Render Trip Points
tripDayContainer.innerHTML = `Loading route...`;

let tripPoints = null;
let tripDestinations = null;
let tripOffers = null;

const renderTripPoints = (data, dist) => {
  dist.innerHTML = ``;

  for (let tripPoint of data) {
    const tripPointComponent = new TripPoint(tripPoint);
    const tripPointEditComponent = new TripPointEdit(tripPoint, tripOffers, tripDestinations);

    // Submit Edited Trip Point
    tripPointEditComponent.onSubmit = (newData) => {
      tripPoint.type = newData.type;
      tripPoint.price = newData.price;
      tripPoint.city = newData.city;
      tripPoint.dateStart = newData.dateStart;
      tripPoint.dateEnd = newData.dateEnd;
      tripPoint.offers = newData.offers;
      tripPoint.isFavorite = newData.isFavorite;

      tripPointEditComponent.lockSave();

      provider.updateTripPoint({id: tripPoint.id, data: tripPoint.toRAW()})
        .then((newTripPoint) => {
          tripPointEditComponent.unlockSave();

          tripPointComponent.update(newTripPoint);
          tripPointComponent.render(tripDayContainer);

          dist.replaceChild(tripPointComponent.element, tripPointEditComponent.element);
          tripPointEditComponent.unrender();
        })
        .catch(() => {
          tripPointEditComponent.element.style.border = `1px solid red`;
          tripPointEditComponent.error();
          tripPointEditComponent.unlockSave();
        });

      setTotalPrice(tripPoints);
    };

    // Delete Trip Point
    tripPointEditComponent.onDelete = (id) => {
      tripPointEditComponent.lockDelete();

      provider.deleteTripPoint({id})
        .then(() => {
          tripPointEditComponent.unlockDelete();
        })
        .then(() => provider.getTripPoints())
        .then(renderTripDays)
        .then(() => {
          tripPointEditComponent.unrender();
        })
        .catch(() => {
          tripPointEditComponent.element.style.border = `1px solid red`;
          tripPointEditComponent.error();
          tripPointEditComponent.unlockDelete();
        });

      tripPoints.splice(id, 1);

      setTotalPrice(tripPoints);
    };

    // Enter Trip Point Edit Mode
    tripPointComponent.onEdit = () => {
      tripPointEditComponent.render(tripDayContainer);
      dist.replaceChild(tripPointEditComponent.element, tripPointComponent.element);
      tripPointComponent.unrender();
    };

    // Exit Trip Point Edit Mode
    tripPointEditComponent.onKeydownEsc = () => {
      tripPointComponent.render(tripDayContainer);
      dist.replaceChild(tripPointComponent.element, tripPointEditComponent.element);
      tripPointEditComponent.unrender();
    };

    dist.appendChild(tripPointComponent.render(tripDayContainer));
  }
};

const getSortedTripPointsByDay = (points) => {
  let result = {};
  for (let point of points) {
    const day = moment(point.dateStart).format(`D MMM YY`);

    if (!result[day]) {
      result[day] = [];
    }

    result[day].push(point);
  }

  return result;
};

const renderTripDays = (days) => {
  tripDayContainer.innerHTML = ``;
  const pointSortedDay = getSortedTripPointsByDay(days);

  Object.entries(pointSortedDay).forEach((points) => {
    const [day, eventList] = points;
    const dayTripPoints = new TravelDay(day).render();

    tripDayContainer.appendChild(dayTripPoints);

    const distEvents = dayTripPoints.querySelector(`.trip-day__items`);
    renderTripPoints(eventList, distEvents);
  });
};

// Create New Trip Point
newTripPointButton.addEventListener(`click`, () => {
  newTripPointButton.disabled = true;
  const newTripPointEditComponent = new TripPointEdit(tripPointMockData, tripOffers, tripDestinations);
  tripDayContainer.insertBefore(newTripPointEditComponent.render(), tripDayContainer.firstChild);

  let tripPoint = ModelTripPoint.parseTripPoint(tripPointMockData, tripOffers, tripDestinations);

  newTripPointEditComponent.onSubmit = (newData) => {
    tripPoint.type = newData.type;
    tripPoint.price = newData.price;
    tripPoint.city = newData.city;
    tripPoint.description = newData.description;
    tripPoint.pictures = newData.pictures;
    tripPoint.dateStart = newData.dateStart;
    tripPoint.dateEnd = newData.dateEnd;
    tripPoint.offers = newData.offers;
    tripPoint.isFavorite = newData.isFavorite;

    newTripPointEditComponent.lockSave();

    provider.createTripPoint({tripPoint})
      .then(() => {
        newTripPointEditComponent.unlockSave();
        tripPoints.push(tripPoint);
      })
      .then(() => provider.getTripPoints())
      .then(() => {
        renderTripDays(tripPoints);
        newTripPointButton.disabled = false;
        newTripPointEditComponent.unrender();
        setTotalPrice(tripPoints);
      })
      .catch(() => {
        newTripPointEditComponent.element.style.border = `1px solid red`;
        newTripPointEditComponent.error();
        newTripPointEditComponent.unlockSave();
      });
  };

  newTripPointEditComponent.onDelete = () => {
    newTripPointEditComponent.lockDelete();
    newTripPointEditComponent.unrender();
    renderTripDays(tripPoints);
    newTripPointButton.disabled = false;
  };

  newTripPointEditComponent.onKeydownEsc = () => {
    newTripPointEditComponent.unlockDelete();
    newTripPointEditComponent.unrender();
    renderTripDays(tripPoints);
    newTripPointButton.disabled = false;
  };
});

// Get Trip Points, Destinations And Offers
document.addEventListener(`DOMContentLoaded`, () => {
  Promise.all([provider.getTripPoints(), provider.getDestinations(), provider.getOffers()])
    .then(([responseTripPoints, responseDestinations, responseOffers]) => {
      tripPoints = responseTripPoints;
      tripDestinations = responseDestinations;
      tripOffers = responseOffers;
    })
    .then(() => {
      renderTripDays(tripPoints);
      setTotalPrice(tripPoints);
    })
    .catch(() => {
      tripDayContainer.innerHTML = `Something went wrong while loading your route info. Check your connection or try again later`;
    });
});

// Render Filters
const renderFilters = (filters, container, type) => {
  for (let item of filters) {
    const filter = new Filter(item, type);

    filter.onFilter = () => {
      tripDayContainer.innerHTML = ``;
      let newTripPointData = filterTripPoint(tripPoints, filter.element.id);
      renderTripDays(newTripPointData);
    };

    filter.render();
    container.appendChild(filter.element);
  }
};

const filterTripPoint = (items, filterName) => {
  let filteredTripPoints = null;

  switch (filterName) {
    case `everything`:
    case `offers`:
      filteredTripPoints = items;
      break;
    case `future`:
      filteredTripPoints = items.filter((item) => new Date() < new Date(item.dateStart));
      break;
    case `past`:
      filteredTripPoints = items.filter((item) => new Date() > new Date(item.dateStart));
      break;
    case `price`:
      filteredTripPoints = items.sort((a, b) => b.price - a.price);
      break;
    case `time`:
      filteredTripPoints = items.sort((a, b) => b.dateStart - a.dateStart);
      break;
    default:
      filteredTripPoints = items.sort((a, b) => a.id - b.id);
  }

  return filteredTripPoints;
};

renderFilters(filtersList, filtersContainer, `filters`);
renderFilters(sortingList, sortingContainer, `sorting`);

// Calculate Total Price In trip__total
const totalCostComponent = new TotalCost();
totalCostContainer.appendChild(totalCostComponent.render());

const setTotalPrice = (points) => {
  totalCostContainer.innerHTML = ``;
  let updatedPrice = 0;

  for (let point of points) {
    updatedPrice += +point[`price`];
  }

  const newTotalCostComponent = new TotalCost(updatedPrice);
  totalCostContainer.appendChild(newTotalCostComponent.render());
};

// Switch View Controller
switchContainer.addEventListener(`click`, (evt) => {
  evt.preventDefault();

  switchItems.forEach((item) => {
    item.classList.remove(`view-switch__item--active`);
  });

  const activeItem = evt.target;
  activeItem.classList.add(`view-switch__item--active`);

  if (evt.target.textContent === `Stats`) {
    mainContainer.classList.add(`visually-hidden`);
    statisticsContainer.classList.remove(`visually-hidden`);
    createStatistics(tripPoints);
  } else {
    mainContainer.classList.remove(`visually-hidden`);
    statisticsContainer.classList.add(`visually-hidden`);
  }
});

// Offline
window.addEventListener(`offline`, () => {
  document.title = `${document.title} [OFFLINE]`;
});

// Online
window.addEventListener(`online`, () => {
  document.title = document.title.split(` [OFFLINE]`)[0];
  provider.syncTripPoints();
});
