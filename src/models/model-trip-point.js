class ModelTripPoint {
  constructor(data) {
    this.id = data.id;
    this.type = data.type;
    this.destination = data[`destination`] ? data[`destination`].name : ``;
    this.description = data[`destination`] ? data[`destination`].description : ``;
    this.pictures = data[`destination`] ? data[`destination`].pictures : [];
    this.price = data[`base_price`] || 0;
    this.dateStart = data[`date_from`] || Date.now();
    this.dateEnd = data[`date_to`] || Date.now();
    this.isFavorite = data[`is_favorite`] || false;
    this.offers = data.offers;
  }

  toRAW() {
    return {
      'id': this.id,
      'is_favorite': this.isFavorite,
      'type': this.type,
      'base_price': this.price,
      'date_from': this.dateStart,
      'date_to': this.dateEnd,
      'destination': this.destination,
      'offers': this.offers,
    };
  }

  static parseTripPoint(data) {
    return new ModelTripPoint(data);
  }

  static parseTripPoints(data) {
    return data.map(ModelTripPoint.parseTripPoint);
  }
}

export default ModelTripPoint;
