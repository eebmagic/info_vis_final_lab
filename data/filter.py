import pandas as pd

data = pd.read_csv('movies.csv')
print(data['title_year'])
print(data.shape)
print(data['title_year'].unique())

selection = data[data.title_year.notnull()]
print(selection)
print(selection['title_year'])
print(selection.shape)
print(selection['title_year'].unique())

selection.to_csv('filtered_movies.csv')