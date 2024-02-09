cmake_minimum_required(VERSION 3.25)

project(bare_inspect C)

include(bare)

add_bare_module(bare_inspect)

target_sources(
  ${bare_inspect}
  PRIVATE
    binding.c
)
