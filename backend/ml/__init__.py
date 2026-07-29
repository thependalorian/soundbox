"""Model training and feature engineering for the anomaly detector.

Kept out of `app/` because this is offline/batch work: the API imports
`ml.features` for inference, but nothing here runs during a request.
"""
